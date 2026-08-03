import { Page } from "@strapi/admin/strapi-admin";
import { Routes, Route } from "react-router-dom";

import { OrderDetailPage } from "./pages/OrderDetailPage";
import { OrderListPage } from "./pages/OrderListPage";

const readPermission = [{ action: "plugin::order-admin.read", subject: null }];

export function App() {
  return (
    <Page.Protect permissions={readPermission}>
      <Routes>
        <Route index element={<OrderListPage />} />
        <Route path=":documentId" element={<OrderDetailPage />} />
      </Routes>
    </Page.Protect>
  );
}
