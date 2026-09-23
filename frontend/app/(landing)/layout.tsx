

import Footer from "@/components/landing/footer";
import Navbar from "@/components/landing/navbar";
import { PropsWithChildren } from "react";


export default function layout({ children }: PropsWithChildren) {

  return (
       <div >
          <Navbar/>
          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-card/50">
            {children}
          </main>
          <Footer/>
          </div>

  );
}
