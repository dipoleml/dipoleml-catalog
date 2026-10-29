import "./assets/style.css";

import Footer from "./components/footer";
import Header from "./components/header";
import { Page } from "@/types/landing";

export default function ({
  children,
  page,
}: Readonly<{
  children: React.ReactNode;
  page: Page;
}>) {
  return (
    <main>
      {page.header && <Header header={page.header} />}
      {children}
      {page.footer && <Footer footer={page.footer} />}
    </main>
  );
}
