import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import App from "./App.jsx";
export function render(url, initialPublicData, publicError) {
  return renderToString(
    <MemoryRouter initialEntries={[url]}>
      <App initialPublicData={initialPublicData} publicError={publicError} />
    </MemoryRouter>,
  );
}
