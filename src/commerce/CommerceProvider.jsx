import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { products as previewProducts } from "../catalog";
import { configured, supabase, userClient, mapProduct } from "./client";
const Commerce = createContext(null);
export const useCommerce = () => useContext(Commerce);
export function CommerceProvider({ children }) {
  const [session, setSession] = useState(null),
    [authLoading, setAuthLoading] = useState(configured),
    [isStaff, setIsStaff] = useState(false);
  const [roleCheckedToken, setRoleCheckedToken] = useState("");
  const [catalog, setCatalog] = useState(previewProducts),
    [settings, setSettings] = useState(null),
    [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(configured),
    [error, setError] = useState("");
  const customerClient = useMemo(
    () => (configured ? userClient(session) : null),
    [session?.access_token],
  );
  const reload = useCallback(async () => {
    if (!configured) return;
    setLoading(true);
    setError("");
    try {
      const [p, s, z] = await Promise.all([
        supabase
          .from("products")
          .select("*,product_variants(*)")
          .eq("status", "active")
          .order("created_at"),
        supabase.from("store_settings").select("*").single(),
        supabase.from("shipping_zones").select("*").eq("enabled", true),
      ]);
      if (p.error || s.error || z.error)
        throw new Error("We couldn’t load the collection. Please retry.");
      const products = p.data
        .filter((row) => row.product_variants.some((v) => v.active))
        .map(mapProduct);
      setSettings(s.data);
      setZones(z.data);
      setCatalog(
        products.length || s.data.checkout_enabled ? products : previewProducts,
      );
    } catch (e) {
      setError(e.message);
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  useEffect(() => {
    if (!configured) return;
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (active) {
        setSession(error ? null : data.session);
        setAuthLoading(false);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setAuthLoading(false);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    let active = true;
    setIsStaff(false);
    if (customerClient)
      customerClient
        .rpc("store_accept_staff_invitation")
        .then(({ data, error }) => {
          if (active) {
            setIsStaff(!error && data === true);
            setRoleCheckedToken(session.access_token);
          }
        });
    return () => {
      active = false;
    };
  }, [customerClient]);
  const getProduct = useCallback(
    (id) => catalog.find((p) => p.id === id),
    [catalog],
  );
  const preview = catalog.some((p) => !p.fromDatabase || p.isDemo);
  return (
    <Commerce.Provider
      value={{
        configured,
        session,
        user: session?.user,
        customerClient,
        authLoading,
        isStaff,
        roleLoading:
          !!session?.user && roleCheckedToken !== session.access_token,
        products: catalog,
        getProduct,
        preview,
        settings,
        zones,
        loading,
        error,
        reload,
        checkoutOpen: !!settings?.checkout_enabled && !error,
      }}
    >
      {children}
    </Commerce.Provider>
  );
}
