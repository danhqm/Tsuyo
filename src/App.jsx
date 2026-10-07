import {
  createContext,
  lazy,
  Suspense,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Asterisk,
  Check,
  ChevronDown,
  Heart,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { campaign, money } from "./catalog";
import { CommerceProvider, useCommerce } from "./commerce/CommerceProvider";
import { storeRequest } from "./commerce/client";
const Account = lazy(() => import("./commerce/Account"));
const Admin = lazy(() => import("./commerce/Admin"));
import ConnectedCheckout, { OrderConfirmation } from "./commerce/Checkout";

gsap.registerPlugin(ScrollTrigger);
const Store = createContext(null);
const useStore = () => useContext(Store);
const unitPrice = (product, size) =>
  product?.variants?.find((v) => v.size === size)?.price_minor / 100 ||
  product?.price ||
  0;

function readSaved(key, fallback, validate) {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    return validate(data) ? data : fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Private browsing can disable storage. */
  }
}

function StoreProvider({ children }) {
  const { getProduct, user, customerClient, preview, loading } = useCommerce();
  const bagKey = user ? `tsuyo-bag:${user.id}` : "tsuyo-bag";
  const savedKey = user ? `tsuyo-saved:${user.id}` : "tsuyo-saved";
  const hydrated = useRef(false),
    syncQueue = useRef(Promise.resolve());
  const [synced, setSynced] = useState(false);
  const [bag, setBag] = useState(() =>
    readSaved(
      bagKey,
      user ? readSaved("tsuyo-bag", [], Array.isArray) : [],
      (v) =>
        Array.isArray(v) &&
        v.every(
          (i) =>
            typeof i.id === "string" &&
            typeof i.size === "string" &&
            Number.isInteger(i.quantity) &&
            i.quantity > 0 &&
            i.quantity <= 10,
        ),
    ),
  );
  const [saved, setSaved] = useState(() =>
    readSaved(
      savedKey,
      user ? readSaved("tsuyo-saved", [], Array.isArray) : [],
      (v) => Array.isArray(v) && v.every((id) => typeof id === "string"),
    ),
  );
  const [overlay, setOverlay] = useState(null);
  const [quickProduct, setQuickProduct] = useState(null);
  const [toast, setToast] = useState("");
  useEffect(() => save(bagKey, bag), [bag, bagKey]);
  useEffect(() => save(savedKey, saved), [saved, savedKey]);
  useEffect(() => {
    if (!customerClient || preview || loading || hydrated.current) return;
    let active = true;
    Promise.all([
      customerClient
        .from("carts")
        .select("id,cart_items(quantity,product_variants(product_id,size))")
        .eq("user_id", user.id)
        .maybeSingle(),
      customerClient
        .from("wishlist_items")
        .select("product_id")
        .eq("user_id", user.id),
    ]).then(async ([remote, wish]) => {
      if (!active) return;
      if (remote.error || wish.error) {
        setToast(
          "Your bag is saved on this device. Account sync could not complete.",
        );
        return;
      }
      const rows = (remote.data?.cart_items || [])
        .filter((i) => i.product_variants)
        .map((i) => ({
          id: i.product_variants.product_id,
          size: i.product_variants.size,
          quantity: i.quantity,
        }));
      setBag((local) => {
        const merged = [...rows];
        for (const item of local) {
          const old = merged.find(
            (i) => i.id === item.id && i.size === item.size,
          );
          if (old) old.quantity = Math.max(old.quantity, item.quantity);
          else merged.push(item);
        }
        return merged;
      });
      const localSaved = readSaved(savedKey, [], Array.isArray);
      setSaved([
        ...new Set([...wish.data.map((i) => i.product_id), ...localSaved]),
      ]);
      const missing = localSaved.filter(
        (id) => getProduct(id) && !wish.data.some((i) => i.product_id === id),
      );
      if (missing.length)
        await customerClient.from("wishlist_items").upsert(
          missing.map((id) => ({ user_id: user.id, product_id: id })),
          { onConflict: "user_id,product_id" },
        );
      if (active) {
        hydrated.current = true;
        setSynced(true);
        save("tsuyo-bag", []);
        save("tsuyo-saved", []);
      }
    });
    return () => {
      active = false;
    };
  }, [customerClient, user?.id, preview, loading, getProduct, savedKey]);
  useEffect(() => {
    if (!customerClient || !synced || preview || loading) return;
    const timer = setTimeout(() => {
      const items = bag.flatMap((i) => {
        const v = getProduct(i.id)?.variants?.find(
          (v) => v.size === i.size && v.active,
        );
        return v ? [{ variant_id: v.id, quantity: i.quantity }] : [];
      });
      syncQueue.current = syncQueue.current
        .then(() =>
          customerClient.rpc("store_replace_cart", { p_items: items }),
        )
        .then(({ error }) => {
          if (error)
            setToast(
              "Your bag is saved here. Account sync could not complete.",
            );
        })
        .catch(() => {});
    }, 350);
    return () => clearTimeout(timer);
  }, [bag, customerClient, synced, preview, loading, getProduct]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);
  const add = (id, size) => {
    if (!getProduct(id)?.sizes.includes(size)) return;
    const variant = getProduct(id)?.variants?.find((v) => v.size === size);
    if (
      variant &&
      variant.stock_on_hand - variant.stock_reserved <=
        (bag.find((i) => i.id === id && i.size === size)?.quantity || 0)
    ) {
      setToast("This size is out of stock. Choose another size.");
      return;
    }
    setBag((items) => {
      const existing = items.find(
        (item) => item.id === id && item.size === size,
      );
      return existing
        ? items.map((item) =>
            item === existing
              ? { ...item, quantity: Math.min(item.quantity + 1, 10) }
              : item,
          )
        : [...items, { id, size, quantity: 1 }];
    });
    setQuickProduct(null);
    setOverlay("bag");
  };
  const updateQuantity = (id, size, quantity) =>
    setBag((items) =>
      items.flatMap((item) =>
        item.id === id && item.size === size
          ? quantity > 0
            ? [{ ...item, quantity: Math.min(quantity, 10) }]
            : []
          : [item],
      ),
    );
  const toggleSaved = (id) => {
    if (customerClient && !preview && synced) {
      const mutation = saved.includes(id)
        ? customerClient
            .from("wishlist_items")
            .delete()
            .eq("user_id", user.id)
            .eq("product_id", id)
        : customerClient
            .from("wishlist_items")
            .upsert({ user_id: user.id, product_id: id });
      mutation.then(({ error }) => {
        if (error)
          setToast("Saved on this device. Account sync could not complete.");
      });
    }
    setSaved((items) =>
      items.includes(id)
        ? items.filter((value) => value !== id)
        : [...items, id],
    );
    setToast(
      saved.includes(id)
        ? "Removed from your saved pieces."
        : "Added to your saved pieces.",
    );
  };
  const count = bag.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = bag.reduce(
    (sum, item) =>
      sum + unitPrice(getProduct(item.id), item.size) * item.quantity,
    0,
  );
  return (
    <Store.Provider
      value={{
        bag,
        saved,
        overlay,
        setOverlay,
        quickProduct,
        setQuickProduct,
        toast,
        setToast,
        add,
        updateQuantity,
        toggleSaved,
        count,
        subtotal,
        clearPurchased: (items) =>
          setBag((bag) =>
            bag.flatMap((item) => {
              const purchased = items.find(
                (i) => i.product_id === item.id && i.size === item.size,
              );
              const quantity = item.quantity - (purchased?.quantity || 0);
              return quantity > 0 ? [{ ...item, quantity }] : [];
            }),
          ),
      }}
    >
      {children}
    </Store.Provider>
  );
}

function ScrollManager() {
  const { getProduct, loading } = useCommerce();
  useEffect(() => {
    const frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(frame);
  }, [loading]);
  const location = useLocation();
  useEffect(() => {
    if (
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      matchMedia("(pointer: coarse)").matches
    )
      return;
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    window.tsuyoLenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      delete window.tsuyoLenis;
    };
  }, []);
  useLayoutEffect(() => {
    window.tsuyoLenis?.scrollTo(0, { immediate: true });
    window.scrollTo({ top: 0, behavior: "instant" });
    const title =
      location.pathname === "/"
        ? "Built Through Effort"
        : location.pathname === "/shop"
          ? "Shop the Core Collection"
          : location.pathname.startsWith("/product/")
            ? getProduct(location.pathname.split("/").pop())?.name || "Product"
            : location.pathname === "/checkout"
              ? "Checkout"
              : location.pathname === "/account"
                ? "Your Account"
                : location.pathname === "/admin"
                  ? "Store Management"
                  : location.pathname === "/checkout/complete"
                    ? "Your Order"
                    : location.pathname.startsWith("/help/")
                      ? helpContent[location.pathname.split("/").pop()]
                          ?.title || "Size Guide"
                      : "The Tsuyo Mindset";
    document.title = `TSUYO — ${title}`;
    const refresh = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(refresh);
  }, [location.key, location.pathname, location.search]);
  return null;
}

function Brand({ large = false }) {
  return (
    <span className={`wordmark ${large ? "wordmark-large" : ""}`}>TSUYO</span>
  );
}

function Header() {
  const { setOverlay, count, saved } = useStore();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 50);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <>
      <div className="announcement">
        <span>THE WORK DOESN’T STOP. NEITHER DO WE.</span>
        <span className="announcement-right">
          GYMWEAR FOR THE EVERYDAY PURSUIT.
        </span>
      </div>
      <header className={`header ${scrolled ? "is-scrolled" : ""}`}>
        <Link className="brand-link" to="/" aria-label="Tsuyo home">
          <Brand />
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <NavLink to="/shop?category=men">Men</NavLink>
          <NavLink to="/shop?category=women">Women</NavLink>
          <NavLink to="/shop">
            The Core Collection
            <span className="nav-dot" />
          </NavLink>
          <NavLink to="/mindset">Our Mindset</NavLink>
        </nav>
        <div className="header-actions">
          <Link to="/account" className="icon-button" aria-label="Your account">
            <UserRound size={20} />
          </Link>
          <button
            className="icon-button"
            onClick={() => setOverlay("search")}
            aria-label="Search products"
          >
            <Search size={20} />
          </button>
          <button
            className="icon-button saved-button"
            onClick={() => setOverlay("saved")}
            aria-label={`Saved pieces (${saved.length})`}
          >
            <Heart size={20} />
          </button>
          <button
            className="bag-button"
            onClick={() => setOverlay("bag")}
            aria-label={`Shopping bag (${count})`}
          >
            <ShoppingBag size={19} />
            <span className="bag-label">Bag</span>
            <span className="bag-count">{count}</span>
          </button>
          <button
            className="icon-button mobile-menu"
            onClick={() => setOverlay("menu")}
            aria-label="Open menu"
          >
            <Menu size={23} />
          </button>
        </div>
      </header>
    </>
  );
}

function ContextCursor() {
  const cursor = useRef(null);
  useEffect(() => {
    if (
      matchMedia("(pointer: coarse)").matches ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const element = cursor.current;
    const xTo = gsap.quickTo(element, "x", {
      duration: 0.32,
      ease: "power3.out",
    });
    const yTo = gsap.quickTo(element, "y", {
      duration: 0.32,
      ease: "power3.out",
    });
    const move = (event) => {
      xTo(event.clientX);
      yTo(event.clientY);
      const target = event.target.closest("[data-cursor]");
      element.classList.toggle("active", !!target);
      if (target) element.firstElementChild.textContent = target.dataset.cursor;
    };
    const hide = () => element.classList.remove("active");
    window.addEventListener("pointermove", move);
    document.addEventListener("pointerleave", hide);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", hide);
      gsap.killTweensOf(element);
    };
  }, []);
  return (
    <div ref={cursor} className="context-cursor" aria-hidden="true">
      <span>Explore</span>
      <ArrowUpRight size={17} />
    </div>
  );
}

function ProductCard({ product }) {
  const { saved, toggleSaved, setQuickProduct } = useStore();
  return (
    <article className="product-card">
      <div className="product-photo">
        <Link to={`/product/${product.id}`} aria-label={`View ${product.name}`}>
          <img
            src={product.image}
            alt={`${product.name} in ${product.color}`}
            width="880"
            height="1168"
            loading="lazy"
          />
        </Link>
        <span className="product-tag">CORE / 26</span>
        <button
          className={`save-product ${saved.includes(product.id) ? "is-saved" : ""}`}
          aria-label={`${saved.includes(product.id) ? "Unsave" : "Save"} ${product.name}`}
          aria-pressed={saved.includes(product.id)}
          onClick={() => toggleSaved(product.id)}
        >
          <Heart size={18} />
        </button>
        <button className="quick-add" onClick={() => setQuickProduct(product)}>
          Quick add
          <Plus size={16} />
        </button>
      </div>
      <div className="product-info">
        <Link to={`/product/${product.id}`}>{product.name}</Link>
        <span>{money(product.price)}</span>
      </div>
      <div className="product-color">
        <span style={{ background: product.colorHex }} />
        {product.color}
      </div>
    </article>
  );
}

function Home() {
  const { products, preview } = useCommerce();
  const root = useRef(null);
  useLayoutEffect(() => {
    const context = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add(
        "(prefers-reduced-motion: no-preference) and (min-width: 769px)",
        () => {
          gsap.to(".hero-media", {
            scale: 1.13,
            yPercent: 4,
            ease: "none",
            scrollTrigger: {
              trigger: ".hero-sequence",
              start: "top top",
              end: "bottom bottom",
              scrub: 1,
            },
          });
          gsap.to(".hero-content", {
            y: -75,
            opacity: 0.08,
            ease: "none",
            scrollTrigger: {
              trigger: ".hero-sequence",
              start: "15% top",
              end: "bottom bottom",
              scrub: 0.7,
            },
          });
          const mindset = gsap.timeline({
            scrollTrigger: {
              trigger: ".mindset-sequence",
              start: "top 76px",
              end: "bottom bottom",
              scrub: 1,
            },
          });
          mindset
            .fromTo(
              ".mindset-image-wrap",
              { clipPath: "inset(14% 19% 14% 19%)" },
              {
                clipPath: "inset(0% 0% 0% 0%)",
                duration: 1.2,
                ease: "power2.inOut",
              },
            )
            .fromTo(
              ".mindset-image",
              { scale: 1.17 },
              { scale: 1, duration: 1.2, ease: "none" },
              0,
            )
            .to(
              ".mindset-chapter-one",
              { y: -60, opacity: 0, duration: 0.45 },
              0.75,
            )
            .fromTo(
              ".mindset-chapter-two",
              { y: 65, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.65 },
              1,
            );
          gsap.to(".marquee-track", {
            xPercent: -15,
            ease: "none",
            scrollTrigger: {
              trigger: ".belief-marquee",
              start: "top bottom",
              end: "bottom top",
              scrub: 1.5,
            },
          });
        },
      );
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".hero-line span", {
          yPercent: 110,
          duration: 1.1,
          stagger: 0.12,
          ease: "power4.out",
        });
        gsap.utils.toArray(".product-card").forEach((element, index) =>
          gsap.from(element, {
            y: 40,
            duration: 0.85,
            delay: index * 0.07,
            ease: "power3.out",
            scrollTrigger: { trigger: element, start: "top 94%", once: true },
          }),
        );
        gsap.utils.toArray(".category-image").forEach((image) =>
          gsap.fromTo(
            image,
            { yPercent: -5 },
            {
              yPercent: 5,
              ease: "none",
              scrollTrigger: {
                trigger: image.closest(".category-tile"),
                start: "top bottom",
                end: "bottom top",
                scrub: 1,
              },
            },
          ),
        );
      });
    }, root);
    const resize = () => ScrollTrigger.refresh();
    document.fonts.ready.then(resize);
    return () => context.revert();
  }, []);
  const explore = () => {
    const target = document.getElementById("collection");
    if (window.tsuyoLenis) window.tsuyoLenis.scrollTo(target, { offset: -100 });
    else
      target.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  };
  return (
    <main ref={root} id="main-content">
      <section
        className="hero-sequence"
        aria-label="Tsuyo Core Collection campaign"
      >
        <div className="hero">
          <div className="hero-media">
            <img
              src={campaign.hero}
              alt="Athlete in a Tsuyo oversized tee in an industrial gym"
              fetchPriority="high"
              width="2688"
              height="1520"
            />
            {campaign.video && (
              <video autoPlay loop muted playsInline poster={campaign.hero}>
                <source src={campaign.video} type="video/mp4" />
              </video>
            )}
          </div>
          <div className="hero-shade" />
          <div className="hero-content">
            <h1>
              <span className="hero-line">
                <span>BUILT</span>
              </span>
              <span className="hero-line">
                <span>THROUGH</span>
              </span>
              <span className="hero-line">
                <span>
                  EFFORT<span className="accent-period">.</span>
                </span>
              </span>
            </h1>
            <p>
              Gymwear for the early starts. The last reps.
              <br />
              And everything you’re becoming.
            </p>
            <Link to="/shop" className="button button-light">
              Shop the collection
              <ArrowUpRight size={19} />
            </Link>
          </div>
          <div className="hero-bottom">
            <span>THE CORE COLLECTION — 2026</span>
            <button onClick={explore}>
              DISCOVER TSUYO
              <ArrowDown size={16} />
            </button>
            <span className="hero-bottom-right">STRENGTH IS BUILT.</span>
          </div>
          <div className="hero-side-note" aria-hidden="true">
            EVERY REP. EVERY DAY.
          </div>
        </div>
      </section>
      <section className="intro section-padding">
        <div className="intro-mark" aria-hidden="true">
          強
        </div>
        <div className="intro-copy">
          <h2>
            Strength is a mindset.
            <br />
            Wear yours.
          </h2>
          <p>
            Tsuyo is for those who show up. Gymwear with purpose, built around
            the pursuit of a stronger you. No noise. Just the work.
          </p>
          <Link className="text-link" to="/mindset">
            This is Tsuyo
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <span className="intro-aside">
          THE ONLY WAY
          <br />
          IS THROUGH.
        </span>
      </section>
      <section className="featured section-padding" id="collection">
        <div className="section-heading">
          <h2>Your everyday armour.</h2>
          <Link to="/shop" className="text-link">
            Explore the collection
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {preview && (
          <p className="preview-caption">
            PREVIEW COLLECTION · ILLUSTRATIVE PRODUCTS & PRICES
          </p>
        )}
      </section>
      <section className="categories" aria-label="Shop by collection">
        <Link
          className="category-tile category-men"
          to="/shop?category=men"
          data-cursor="Shop men"
        >
          <img
            className="category-image"
            src={campaign.hero}
            alt="Men’s Tsuyo gymwear campaign"
            width="2688"
            height="1520"
            loading="lazy"
          />
          <div className="category-shade" />
          <div className="category-copy">
            <div>
              <h2>MEN’S</h2>
              <span className="circle-arrow">
                <ArrowUpRight size={29} />
              </span>
            </div>
          </div>
        </Link>
        <Link
          className="category-tile"
          to="/shop?category=women"
          data-cursor="Shop women"
        >
          <img
            className="category-image"
            src={campaign.women}
            alt="Women’s Tsuyo gymwear campaign"
            width="880"
            height="1168"
            loading="eager"
          />
          <div className="category-shade" />
          <div className="category-copy">
            <div>
              <h2>WOMEN’S</h2>
              <span className="circle-arrow">
                <ArrowUpRight size={29} />
              </span>
            </div>
          </div>
        </Link>
      </section>
      <div className="belief-marquee" aria-hidden="true">
        <div className="marquee-track">
          THE WORK IS THE WAY.
          <Asterisk />
          THE WORK IS THE WAY.
          <Asterisk />
          THE WORK IS THE WAY.
          <Asterisk />
        </div>
      </div>
      <section className="mindset-sequence" aria-label="The Tsuyo mindset">
        <div className="mindset-sticky">
          <div className="mindset-image-wrap">
            <img
              className="mindset-image"
              src={campaign.mindset}
              alt="A dark industrial gym with the words You vs You reflected in the mirror"
              width="1199"
              height="1615"
              loading="eager"
            />
            <div className="mindset-shade" />
          </div>
          <div className="mindset-chapter mindset-chapter-one">
            <h2>
              YOU VS.
              <br />
              YOU.
            </h2>
            <p>The only competition that matters.</p>
          </div>
          <div className="mindset-chapter mindset-chapter-two">
            <h2>
              ONE MORE
              <br />
              REP.
            </h2>
            <p>A little stronger than yesterday.</p>
          </div>
          <div className="mindset-bottom">
            <span>PROGRESS STARTS WITH SHOWING UP.</span>
            <Link className="text-link" to="/mindset">
              Our mindset
              <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </section>
      <Newsletter />
    </main>
  );
}

function Newsletter() {
  const { configured, session } = useCommerce();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [email, setEmail] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    if (configured) {
      setBusy(true);
      setStatus("");
      try {
        const data = await storeRequest(
          "newsletter",
          { email, consent: true },
          session,
        );
        setStatus(data.message);
        setEmail("");
      } catch (e) {
        setStatus(e.message);
      } finally {
        setBusy(false);
      }
      return;
    }
    const existing = readSaved("tsuyo-newsletter-preview", [], Array.isArray);
    save("tsuyo-newsletter-preview", [
      ...new Set([...existing, email.trim().toLowerCase()]),
    ]);
    setStatus(
      "You’re on the preview list. Your email is saved on this device.",
    );
    setEmail("");
  };
  return (
    <section className="newsletter section-padding">
      <div>
        <h2>
          STAY IN
          <br />
          THE PURSUIT.
        </h2>
        <p>
          Fresh drops. A little motivation.
          <br />
          Be part of what comes next.
        </p>
      </div>
      <form onSubmit={submit}>
        <label htmlFor="newsletter-email">Your email address</label>
        <div className="newsletter-input">
          <input
            id="newsletter-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            maxLength={254}
          />
          <button
            type="submit"
            disabled={busy}
            aria-label="Join the Tsuyo list"
          >
            <ArrowUpRight size={27} />
          </button>
        </div>
        {configured && (
          <label className="consent-line">
            <input type="checkbox" required />
            Email me fresh drops and Tsuyo updates. I can unsubscribe at any
            time.
          </label>
        )}
        <p className="newsletter-note" role="status">
          {status ||
            (configured
              ? "Your email is saved securely for Tsuyo updates."
              : "Preview signup. Your email stays on this device.")}
        </p>
      </form>
    </section>
  );
}

function Footer() {
  const { preview } = useCommerce();
  return (
    <footer className="footer section-padding">
      <div className="footer-top">
        <Link to="/" className="footer-tagline">
          STRENGTH IS BUILT.
          <br />
          EVERY REP. EVERY DAY.
        </Link>
        <nav aria-label="Footer shop">
          <span>THE COLLECTION</span>
          <Link to="/shop?category=men">Men</Link>
          <Link to="/shop?category=women">Women</Link>
          <Link to="/shop">Shop all</Link>
        </nav>
        <nav aria-label="Footer support">
          <span>HERE TO HELP</span>
          <Link to="/help/sizing">Size guide</Link>
          <Link to="/help/delivery">Delivery & returns</Link>
          <Link to="/help/contact">Contact</Link>
        </nav>
        <nav aria-label="Footer brand">
          <span>THE PURSUIT</span>
          <Link to="/mindset">Our mindset</Link>
          <Link to="/help/privacy">Privacy</Link>
          <Link to="/help/terms">Terms</Link>
        </nav>
      </div>
      <Link to="/" className="footer-brand" aria-label="Tsuyo home">
        <Brand large />
      </Link>
      <div className="footer-bottom">
        <span>© TSUYO 2026</span>
        <span>
          {preview
            ? "CONCEPT STOREFRONT · PRODUCTS & PRICES FOR PREVIEW"
            : "GYMWEAR FOR THE EVERYDAY PURSUIT"}
        </span>
        <span>MALAYSIA / MYR</span>
      </div>
    </footer>
  );
}

function Shop() {
  const { products, preview } = useCommerce();
  const [params, setParams] = useSearchParams();
  const category = ["men", "women"].includes(params.get("category"))
    ? params.get("category")
    : "all";
  const query = params.get("q") || "";
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("featured");
  useEffect(() => setType("all"), [category]);
  let result = products.filter(
    (product) =>
      (category === "all" || product.category === category) &&
      (type === "all" || product.type === type) &&
      `${product.name} ${product.color} ${product.type}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  if (sort === "price-low")
    result = [...result].sort((a, b) => a.price - b.price);
  if (sort === "price-high")
    result = [...result].sort((a, b) => b.price - a.price);
  if (sort === "name")
    result = [...result].sort((a, b) => a.name.localeCompare(b.name));
  const changeCategory = (value) => {
    const next = new URLSearchParams(params);
    if (value === "all") next.delete("category");
    else next.set("category", value);
    setParams(next);
  };
  return (
    <main id="main-content" className="shop-page section-padding">
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <span>The collection</span>
      </div>
      <div className="shop-title">
        <h1>
          {query
            ? "FIND YOUR PIECE."
            : category === "men"
              ? "MEN’S COLLECTION."
              : category === "women"
                ? "WOMEN’S COLLECTION."
                : "THE CORE COLLECTION."}
        </h1>
        <p>
          {query
            ? `Results for “${query}”`
            : "Less noise. More purpose. Your everyday training rotation."}
        </p>
      </div>
      <div className="shop-toolbar">
        <div className="filter-tabs" aria-label="Collection filter">
          {[
            ["all", "All pieces"],
            ["men", "Men"],
            ["women", "Women"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => changeCategory(value)}
              className={category === value ? "selected" : ""}
              aria-pressed={category === value}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="shop-selects">
          <label>
            Category
            <select
              aria-label="Product category"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="all">All categories</option>
              {[
                ...new Set(
                  products
                    .filter(
                      (p) => category === "all" || p.category === category,
                    )
                    .map((p) => p.type),
                ),
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
            <ChevronDown size={14} />
          </label>
          <label>
            Sort
            <select
              aria-label="Sort products"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="name">Name: A–Z</option>
            </select>
            <ChevronDown size={14} />
          </label>
        </div>
      </div>
      <div className="results-count" aria-live="polite">
        {result.length} {result.length === 1 ? "piece" : "pieces"}
        {preview && <span>PREVIEW COLLECTION · SAMPLE PRICING</span>}
      </div>
      {result.length ? (
        <div className="product-grid">
          {result.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Search size={32} />
          <h2>No pieces found.</h2>
          <p>Try a different search or reset your filters.</p>
          <button
            className="button button-dark"
            onClick={() => {
              setType("all");
              setParams({});
            }}
          >
            Show all pieces
            <ArrowRight size={17} />
          </button>
        </div>
      )}
    </main>
  );
}

function SizePicker({ product, value, onChange }) {
  return (
    <fieldset className="size-picker">
      <legend>
        Select size <span>{value || "Choose your fit"}</span>
      </legend>
      <div>
        {product.sizes.map((size) => (
          <button
            type="button"
            key={size}
            aria-pressed={size === value}
            disabled={
              product.fromDatabase &&
              product.variants.find((v) => v.size === size)?.stock_on_hand -
                product.variants.find((v) => v.size === size)?.stock_reserved <=
                0
            }
            className={size === value ? "selected" : ""}
            onClick={() => onChange(size)}
          >
            {size}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ProductPage() {
  const { getProduct, products, loading, preview } = useCommerce();
  const { id } = useParams();
  const product = getProduct(id);
  const { add, saved, toggleSaved } = useStore();
  const [size, setSize] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    setSize("");
    setError("");
  }, [id]);
  if (!product)
    return loading ? (
      <main id="main-content" className="product-page section-padding">
        <p role="status">Loading this piece…</p>
      </main>
    ) : (
      <NotFound />
    );
  const submit = (event) => {
    event.preventDefault();
    if (!size) {
      setError("Choose your size to add this piece.");
      return;
    }
    add(product.id, size);
  };
  return (
    <main id="main-content" className="product-page section-padding">
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to={`/shop?category=${product.category}`}>
          {product.category === "men" ? "Men" : "Women"}
        </Link>
        <span>/</span>
        <span>{product.name}</span>
      </div>
      <div className="product-detail-grid">
        <div className="detail-photo">
          <img
            src={product.image}
            alt={`${product.name} in ${product.color}`}
            width="880"
            height="1168"
          />
          <span>THE CORE COLLECTION</span>
        </div>
        <div className="product-details">
          <Link to="/shop" className="back-link">
            <ArrowLeft size={15} />
            Back to collection
          </Link>
          <h1>{product.name.toUpperCase()}.</h1>
          <p className="detail-price">
            {money(unitPrice(product, size))}
            {preview && <span>Illustrative preview price</span>}
          </p>
          <p className="detail-description">{product.description}</p>
          <div className="detail-color">
            <span style={{ background: product.colorHex }} />
            <div>
              Colour<strong>{product.color}</strong>
            </div>
          </div>
          <form onSubmit={submit}>
            <SizePicker
              product={product}
              value={size}
              onChange={(value) => {
                setSize(value);
                setError("");
              }}
            />
            <div className="fit-guide">
              <span>{product.fit}</span>
              <Link to="/help/sizing">
                Size guide
                <ArrowUpRight size={12} />
              </Link>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="detail-add">
              <button className="button button-dark" type="submit">
                Add to bag
                <Plus size={18} />
              </button>
              <button
                className={`detail-save ${saved.includes(id) ? "is-saved" : ""}`}
                type="button"
                aria-label={`${saved.includes(id) ? "Unsave" : "Save"} ${product.name}`}
                aria-pressed={saved.includes(id)}
                onClick={() => toggleSaved(id)}
              >
                <Heart size={21} />
              </button>
            </div>
          </form>
          <div className="product-accordions">
            <details open>
              <summary>
                The details
                <Plus size={15} />
              </summary>
              <ul>
                {product.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </details>
            <details>
              <summary>
                Care for your kit
                <Plus size={15} />
              </summary>
              <p>{product.care}</p>
            </details>
            <details>
              <summary>
                Delivery & returns
                <Plus size={15} />
              </summary>
              <p>
                This is a preview collection. Delivery and returns details will
                be confirmed before the store launches.
              </p>
              <Link to="/help/delivery" className="text-link">
                More information
                <ArrowUpRight size={14} />
              </Link>
            </details>
          </div>
        </div>
      </div>
      <section className="related-products">
        <div className="section-heading">
          <h2>Complete your rotation.</h2>
          <Link to="/shop" className="text-link">
            View all
            <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="product-grid">
          {products
            .filter((p) => p.id !== id)
            .map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
        </div>
      </section>
    </main>
  );
}

function BagItems() {
  const { getProduct } = useCommerce();
  const { bag, updateQuantity } = useStore();
  return (
    <div className="bag-items">
      {bag.map((item) => {
        const product = getProduct(item.id);
        if (!product)
          return (
            <div className="bag-item" key={`${item.id}-${item.size}`}>
              <p>This piece is no longer available.</p>
              <button
                className="text-link"
                onClick={() => updateQuantity(item.id, item.size, 0)}
              >
                Remove unavailable piece
              </button>
            </div>
          );
        return (
          <div className="bag-item" key={`${item.id}-${item.size}`}>
            <Link to={`/product/${item.id}`}>
              <img
                src={product.image}
                alt={product.name}
                width="80"
                height="108"
              />
            </Link>
            <div className="bag-item-details">
              <Link to={`/product/${item.id}`}>{product.name}</Link>
              <p>
                {product.color} / {item.size}
              </p>
              <strong>
                {money(unitPrice(product, item.size) * item.quantity)}
              </strong>
              <div className="quantity-row">
                <div className="quantity-control">
                  <button
                    onClick={() =>
                      updateQuantity(item.id, item.size, item.quantity - 1)
                    }
                    aria-label={`Decrease quantity of ${product.name}`}
                  >
                    <Minus size={13} />
                  </button>
                  <span aria-label="Quantity">{item.quantity}</span>
                  <button
                    disabled={item.quantity >= 10}
                    onClick={() =>
                      updateQuantity(item.id, item.size, item.quantity + 1)
                    }
                    aria-label={`Increase quantity of ${product.name}`}
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <button
                  className="remove-item"
                  onClick={() => updateQuantity(item.id, item.size, 0)}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Modal({ title, onClose, children, className = "" }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    window.tsuyoLenis?.stop();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previous;
      window.tsuyoLenis?.start();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`drawer ${className}`}
      aria-labelledby="drawer-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) {
          const box = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < box.left ||
            event.clientX > box.right ||
            event.clientY < box.top ||
            event.clientY > box.bottom
          )
            onClose();
        }
      }}
    >
      <div className="drawer-header">
        <h2 id="drawer-title">{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close panel"
        >
          <X size={22} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function Overlays() {
  const { products, preview, configured } = useCommerce();
  const {
    overlay,
    setOverlay,
    bag,
    count,
    subtotal,
    saved,
    quickProduct,
    setQuickProduct,
    add,
  } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [size, setSize] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    setOverlay(null);
    setQuickProduct(null);
  }, [location.key, location.pathname, location.search]);
  useEffect(() => {
    setSize("");
    setError("");
  }, [quickProduct]);
  const searchResults = products.filter((p) =>
    `${p.name} ${p.color} ${p.type}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const close = () => {
    setOverlay(null);
    setQuickProduct(null);
  };
  if (quickProduct)
    return (
      <Modal title="FIND YOUR FIT." onClose={close} className="quick-drawer">
        <img
          className="quick-photo"
          src={quickProduct.image}
          alt={quickProduct.name}
        />
        <div className="quick-details">
          <h3>{quickProduct.name}</h3>
          <p>
            {quickProduct.color} · {money(quickProduct.price)}
          </p>
          <SizePicker
            product={quickProduct}
            value={size}
            onChange={(value) => {
              setSize(value);
              setError("");
            }}
          />
          <div className="fit-guide">
            <span>{quickProduct.fit}</span>
            <Link to="/help/sizing">
              Size guide
              <ArrowUpRight size={12} />
            </Link>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="button button-dark full-width"
            onClick={() => {
              if (!size) {
                setError("Choose your size to add this piece.");
                return;
              }
              add(quickProduct.id, size);
            }}
          >
            Add to bag
            <Plus size={18} />
          </button>
          <Link
            to={`/product/${quickProduct.id}`}
            className="quick-detail-link"
          >
            View full details
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </Modal>
    );
  if (!overlay) return null;
  if (overlay === "bag")
    return (
      <Modal title={`YOUR BAG (${count}).`} onClose={close}>
        {bag.length ? (
          <>
            <BagItems />
            <div className="bag-summary">
              <div>
                <span>Subtotal</span>
                <strong>{money(subtotal)}</strong>
              </div>
              <p>Delivery calculated when the store launches.</p>
              <Link className="button button-dark full-width" to="/checkout">
                {configured ? "Checkout" : "Checkout preview"}
                <ArrowRight size={18} />
              </Link>
              <button className="continue-link" onClick={close}>
                Continue exploring
              </button>
              <p className="preview-note">
                {preview
                  ? "The collection is being prepared. No payments are taken."
                  : "Your final total is confirmed at checkout."}
              </p>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <ShoppingBag size={34} />
            <h3>Your next chapter starts here.</h3>
            <p>Your bag is empty. Find the pieces that go with you.</p>
            <Link className="button button-dark" to="/shop">
              Explore the collection
              <ArrowUpRight size={17} />
            </Link>
          </div>
        )}
      </Modal>
    );
  if (overlay === "menu")
    return (
      <Modal title="TSUYO." onClose={close} className="menu-drawer">
        <nav className="menu-links" aria-label="Mobile navigation">
          <Link to="/shop?category=men">
            MEN
            <ArrowUpRight />
          </Link>
          <Link to="/shop?category=women">
            WOMEN
            <ArrowUpRight />
          </Link>
          <Link to="/shop">
            THE COLLECTION
            <ArrowUpRight />
          </Link>
          <Link to="/mindset">
            OUR MINDSET
            <ArrowUpRight />
          </Link>
          <button onClick={() => setOverlay("saved")}>
            SAVED PIECES
            <Heart size={21} />
          </button>
        </nav>
        <p className="menu-note">
          STRENGTH IS BUILT.
          <br />
          EVERY REP. EVERY DAY.
        </p>
      </Modal>
    );
  if (overlay === "saved")
    return (
      <Modal title={`SAVED PIECES (${saved.length}).`} onClose={close}>
        {saved.length ? (
          <div className="saved-grid">
            {products
              .filter((p) => saved.includes(p.id))
              .map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
          </div>
        ) : (
          <div className="empty-state">
            <Heart size={34} />
            <h3>Make it your rotation.</h3>
            <p>Tap the heart on a piece to save it for later.</p>
            <Link className="button button-dark" to="/shop">
              Discover your pieces
              <ArrowUpRight size={17} />
            </Link>
          </div>
        )}
      </Modal>
    );
  return (
    <Modal title="FIND YOUR NEXT." onClose={close} className="search-drawer">
      <form
        className="search-form"
        onSubmit={(event) => {
          event.preventDefault();
          navigate(`/shop?q=${encodeURIComponent(query)}`);
        }}
      >
        <Search size={19} />
        <input
          aria-label="Search the collection"
          autoFocus
          placeholder="T-shirts, shorts, training sets…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          maxLength={120}
        />
        <button type="submit" aria-label="View search results">
          <ArrowRight size={19} />
        </button>
      </form>
      <p className="search-caption">
        {query
          ? `${searchResults.length} matching ${searchResults.length === 1 ? "piece" : "pieces"}`
          : "THE CORE COLLECTION"}
      </p>
      <div className="search-results">
        {searchResults.map((p) => (
          <Link to={`/product/${p.id}`} key={p.id}>
            <img src={p.image} alt={p.name} width="64" height="86" />
            <span>
              <strong>{p.name}</strong>
              <small>{p.color}</small>
            </span>
            <span>{money(p.price)}</span>
          </Link>
        ))}
      </div>
      {!searchResults.length && (
        <div className="empty-state">
          <p>
            No pieces match “{query}”.
            <br />
            Try “tee”, “shorts”, or “set”.
          </p>
        </div>
      )}
    </Modal>
  );
}

function PreviewCheckout() {
  const { bag, subtotal } = useStore();
  const [complete, setComplete] = useState(false);
  if (!bag.length)
    return (
      <main id="main-content" className="checkout-page section-padding">
        <div className="empty-state">
          <ShoppingBag size={38} />
          <h1>YOUR BAG IS EMPTY.</h1>
          <p>Add a piece to explore the checkout.</p>
          <Link to="/shop" className="button button-dark">
            Shop the collection
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </main>
    );
  if (complete)
    return (
      <main id="main-content" className="checkout-page section-padding">
        <div className="checkout-success">
          <div className="success-icon">
            <Check size={32} />
          </div>
          <h1>
            READY FOR
            <br />
            YOUR NEXT SET.
          </h1>
          <p>
            Your order preview is ready. This is a concept storefront, so no
            order has been placed and no payment has been taken.
          </p>
          <div className="success-total">
            <span>
              {bag.reduce((sum, item) => sum + item.quantity, 0)}{" "}
              {bag.reduce((sum, item) => sum + item.quantity, 0) === 1
                ? "piece"
                : "pieces"}
            </span>
            <strong>{money(subtotal)}</strong>
          </div>
          <Link to="/shop" className="button button-dark">
            Keep exploring
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </main>
    );
  return (
    <main id="main-content" className="checkout-page section-padding">
      <Link to="/shop" className="back-link">
        <ArrowLeft size={16} />
        Back to collection
      </Link>
      <h1>CHECKOUT PREVIEW.</h1>
      <p className="checkout-disclaimer">
        Explore the checkout. No orders or payments are processed.
      </p>
      <div className="checkout-grid">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setComplete(true);
            window.scrollTo({ top: 0, behavior: "instant" });
          }}
        >
          <h2>Your details</h2>
          <label>
            Email address
            <input type="email" name="email" autoComplete="email" required />
          </label>
          <div className="form-pair">
            <label>
              First name
              <input name="firstName" autoComplete="given-name" required />
            </label>
            <label>
              Last name
              <input name="lastName" autoComplete="family-name" required />
            </label>
          </div>
          <h2>Delivery address</h2>
          <label>
            Street address
            <input name="street" autoComplete="street-address" required />
          </label>
          <div className="form-pair">
            <label>
              City
              <input name="city" autoComplete="address-level2" required />
            </label>
            <label>
              Postcode
              <input
                name="postcode"
                autoComplete="postal-code"
                inputMode="numeric"
                pattern="[0-9]{5}"
                title="Enter a five-digit Malaysian postcode"
                required
              />
            </label>
          </div>
          <label>
            State or territory
            <select
              name="state"
              autoComplete="address-level1"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Select your state
              </option>
              {[
                "Johor",
                "Kedah",
                "Kelantan",
                "Kuala Lumpur",
                "Labuan",
                "Melaka",
                "Negeri Sembilan",
                "Pahang",
                "Penang",
                "Perak",
                "Perlis",
                "Putrajaya",
                "Sabah",
                "Sarawak",
                "Selangor",
                "Terengganu",
              ].map((state) => (
                <option key={state}>{state}</option>
              ))}
            </select>
          </label>
          <label>
            Country
            <input value="Malaysia" readOnly autoComplete="country-name" />
          </label>
          <div className="checkout-preview-box">
            <Check size={18} />
            <p>
              Your details are used only for this preview and are not saved or
              sent.
            </p>
          </div>
          <button className="button button-dark full-width">
            Preview order
            <ArrowRight size={18} />
          </button>
        </form>
        <aside className="order-summary">
          <h2>Your rotation</h2>
          <BagItems />
          <div className="order-total">
            <span>Subtotal</span>
            <strong>{money(subtotal)}</strong>
          </div>
          <p>
            Delivery and any applicable taxes will be confirmed before launch.
          </p>
          <div className="order-total final-total">
            <span>Preview total</span>
            <strong>{money(subtotal)}</strong>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Mindset() {
  return (
    <main id="main-content" className="story-page">
      <section className="story-hero">
        <img
          src={campaign.mindset}
          alt="You vs You, on the wall of an industrial training gym"
        />
        <div />
        <h1>
          THE ONLY WAY
          <br />
          IS THROUGH.
        </h1>
      </section>
      <section className="story-copy section-padding">
        <h2>
          Tsuyo starts
          <br />
          with showing up.
        </h2>
        <div>
          <p>
            You don’t get stronger overnight. You get stronger in the small
            decisions. The early alarm. The set you finish. The day you show up
            when you don’t feel like it.
          </p>
          <p>
            That’s the spirit of Tsuyo. Gymwear for your own pursuit, and a
            reminder that the person you’re working on is you.
          </p>
          <p>
            No finish line. No shortcuts.
            <br />
            Just a little stronger than yesterday.
          </p>
          <Link className="button button-dark" to="/shop">
            Wear your mindset
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <div className="story-end">
        EVERY REP.
        <br />
        EVERY DAY.
      </div>
      <Newsletter />
    </main>
  );
}

const helpContent = {
  delivery: {
    title: "DELIVERY & RETURNS.",
    paragraphs: [
      "Tsuyo is currently a concept storefront. The collection, prices, and checkout are available for preview.",
      "Shipping regions, delivery times, charges, and the returns policy will be confirmed before the store opens for orders. No purchases or payments can be made during this preview.",
    ],
  },
  contact: {
    title: "LET’S TALK.",
    paragraphs: [
      "Tsuyo is taking shape. Official contact and support details will be published when the store launches.",
      "For now, explore the collection, save your favourite pieces, and get a feel for what comes next.",
    ],
  },
  privacy: {
    title: "YOUR PRIVACY.",
    paragraphs: [
      "This preview stores your shopping bag and saved pieces in your browser so they are there when you come back. Preview newsletter signups are also saved only in this browser.",
      "Checkout information is held temporarily on the page. It is not saved or transmitted. There are no analytics or advertising trackers in this preview.",
      "You can remove the preview’s saved data through your browser’s site-data settings. A complete privacy policy will be available before the store launches.",
    ],
  },
  terms: {
    title: "PREVIEW TERMS.",
    paragraphs: [
      "This website is a design and shopping-flow preview. Products, pricing, sizes, and descriptions are illustrative and are not offers for sale.",
      "No order is placed and no payment is taken. Final product specifications and store terms will be confirmed before launch. Campaign and product photography was created with AI for this concept.",
    ],
  },
};
function Help() {
  const { configured, settings } = useCommerce();
  const { topic } = useParams();
  if (topic === "sizing")
    return (
      <main id="main-content" className="help-page section-padding">
        <Link to="/shop" className="back-link">
          <ArrowLeft size={16} />
          Back to collection
        </Link>
        <h1>FIND YOUR FIT.</h1>
        <p className="help-lead">
          Measure a favourite piece you already own, then compare. Choose your
          usual size for an oversized look, or size down for a closer fit.
        </p>
        <div className="size-table-wrap">
          <table>
            <caption>
              Illustrative size guide · body measurements in centimetres
            </caption>
            <thead>
              <tr>
                <th scope="col">Size</th>
                <th scope="col">Chest</th>
                <th scope="col">Waist</th>
                <th scope="col">Hip</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["XS", "80–86", "62–68", "86–92"],
                ["S", "86–94", "68–76", "92–98"],
                ["M", "94–102", "76–84", "98–106"],
                ["L", "102–110", "84–92", "106–114"],
                ["XL", "110–118", "92–100", "114–122"],
                ["XXL", "118–126", "100–108", "122–130"],
              ].map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) =>
                    index ? (
                      <td key={index}>{cell}</td>
                    ) : (
                      <th key={index} scope="row">
                        {cell}
                      </th>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Measurements are placeholders for this preview. Final garment-specific
          size guides will be provided before launch.
        </p>
      </main>
    );
  const content =
    configured && topic === "privacy"
      ? {
          title: "YOUR PRIVACY.",
          paragraphs: [
            "Your bag and saved pieces are stored in this browser. When you sign in, they can also be saved to your account.",
            "Account details, delivery addresses, orders and newsletter consent are stored in Tsuyo’s Supabase database. Signed-in customers can access their own account data; authorized store staff manage orders and delivery.",
            "Payments use Stripe’s hosted checkout when enabled. Tsuyo does not store card details. There are no advertising or analytics trackers in this site. Contact the store about access or removal of your data. The full commercial privacy policy will be published before checkout opens.",
          ],
        }
      : helpContent[topic];
  if (!content) return <NotFound />;
  return (
    <main id="main-content" className="help-page section-padding">
      <Link to="/shop" className="back-link">
        <ArrowLeft size={16} />
        Back to collection
      </Link>
      <h1>{content.title}</h1>
      <div className="help-body">
        {content.paragraphs.map((text) => (
          <p key={text}>{text}</p>
        ))}
      </div>
      <Link to="/shop" className="text-link">
        Explore the collection
        <ArrowUpRight size={17} />
      </Link>
    </main>
  );
}

function NotFound() {
  return (
    <main id="main-content" className="section-padding not-found">
      <h1>TAKE A DIFFERENT PATH.</h1>
      <p>That page isn’t here. Your next piece might be.</p>
      <Link to="/shop" className="button button-dark">
        Explore the collection
        <ArrowUpRight size={18} />
      </Link>
    </main>
  );
}
function Toast() {
  const { toast } = useStore();
  return (
    <div className={`toast ${toast ? "visible" : ""}`} role="status">
      <Check size={16} />
      {toast}
    </div>
  );
}
function Checkout() {
  const { bag, subtotal } = useStore();
  const { configured, getProduct } = useCommerce();
  return configured ? (
    <ConnectedCheckout bag={bag} subtotal={subtotal} getProduct={getProduct} />
  ) : (
    <PreviewCheckout />
  );
}
function CompleteOrder() {
  const { clearPurchased } = useStore();
  return <OrderConfirmation clearBag={clearPurchased} />;
}
function CatalogStatus() {
  const { error, reload } = useCommerce();
  return error ? (
    <div className="catalog-error" role="alert">
      {error}
      <button className="text-link" onClick={reload}>
        Retry collection
      </button>
    </div>
  ) : null;
}
export default function App() {
  return (
    <CommerceProvider>
      <Storefront />
    </CommerceProvider>
  );
}
function Storefront() {
  const { user } = useCommerce();
  return (
    <StoreProvider key={user?.id || "guest"}>
      <ScrollManager />
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header />
      <CatalogStatus />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/checkout/complete" element={<CompleteOrder />} />
        <Route
          path="/account"
          element={
            <Suspense
              fallback={
                <main
                  id="main-content"
                  className="account-page section-padding"
                >
                  <p role="status">Loading your account…</p>
                </main>
              }
            >
              <Account />
            </Suspense>
          }
        />
        <Route
          path="/admin"
          element={
            <Suspense
              fallback={
                <main id="main-content" className="admin-page section-padding">
                  <p role="status">Loading store management…</p>
                </main>
              }
            >
              <Admin />
            </Suspense>
          }
        />
        <Route path="/mindset" element={<Mindset />} />
        <Route path="/help/:topic" element={<Help />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
      <Overlays />
      <ContextCursor />
      <Toast />
    </StoreProvider>
  );
}
