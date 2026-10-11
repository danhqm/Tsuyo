import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { contentPage } from "./public-content.js";
export default function PublicPage() {
  const { pathname } = useLocation();
  const page = contentPage(pathname);
  return (
    <main id="main-content" className="help-page public-page section-padding">
      <Link to="/shop" className="back-link">
        <ArrowLeft size={16} />
        Back to collection
      </Link>
      <h1>{page.title}</h1>
      <div className="help-body">
        {page.sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((text) => (
              <p key={text}>{text}</p>
            ))}
            {section.code && (
              <pre>
                <code>{section.code}</code>
              </pre>
            )}
          </section>
        ))}
        <nav className="public-links" aria-label={`${page.title} resources`}>
          {(page.links || []).map((link) =>
            link.href.startsWith("/") &&
            !/\.(json|txt)$/.test(link.href) &&
            !link.href.startsWith("/api") &&
            !link.href.startsWith("/.well-known") ? (
              <Link key={link.href} to={link.href}>
                {link.label}
                <ArrowUpRight size={15} />
              </Link>
            ) : (
              <a key={link.href} href={link.href}>
                {link.label}
                <ArrowUpRight size={15} />
              </a>
            ),
          )}
        </nav>
      </div>
    </main>
  );
}

export function PublicUnavailable({ message }) {
  return (
    <main id="main-content" className="help-page public-page section-padding">
      <h1>PLEASE TRY AGAIN.</h1>
      <div className="help-body">
        <p role="alert">{message}</p>
        <nav className="public-links" aria-label="Request recovery">
          <Link to="/contact">
            Contact Tsuyo
            <ArrowUpRight size={15} />
          </Link>
          <Link to="/docs">
            API & agent docs
            <ArrowUpRight size={15} />
          </Link>
        </nav>
      </div>
    </main>
  );
}
