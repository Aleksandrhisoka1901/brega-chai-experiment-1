import { Page } from "@strapi/admin/strapi-admin";
import type { ReactNode } from "react";
import { Routes, Route } from "react-router-dom";

import { InquiryDetailPage } from "./pages/InquiryDetailPage";
import { InquiryListPage } from "./pages/InquiryListPage";
import { OrderDetailPage } from "./pages/OrderDetailPage";
import { OrderListPage } from "./pages/OrderListPage";

const readPermission = [{ action: "plugin::order-admin.read", subject: null }];

function ProtectedRoutes({ children }: { children: ReactNode }) {
  return <Page.Protect permissions={readPermission}>{children}</Page.Protect>;
}

export function App() {
  return (
    <ProtectedRoutes>
      <Routes>
        <Route index element={<OrderListPage />} />
        <Route path="inquiries" element={<InquiryListPage />} />
        <Route path="inquiries/:documentId" element={<InquiryDetailPage />} />
        <Route path=":documentId" element={<OrderDetailPage />} />
      </Routes>
    </ProtectedRoutes>
  );
}

export function InquiriesApp() {
  return (
    <ProtectedRoutes>
      <Routes>
        <Route index element={<InquiryListPage />} />
        <Route path=":documentId" element={<InquiryDetailPage />} />
      </Routes>
    </ProtectedRoutes>
  );
}
