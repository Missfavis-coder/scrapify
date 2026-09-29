
import { SiteTitle } from "../dashboard/dashboard-title";

export async function SiteHeader() {



  return (
    <header className="fixed w-full top-0 z-50 flex md:pt-4 pt-2 items-center px-4 lg:px-6 lg:pb-6 pb-3 bg-white text-secondary border-b border-neutral-200 ">
      <div className="flex w-full items-center justify-between">

        <SiteTitle/>

        {/* RIGHT */}
        <div className="flex items-center md:gap-4 gap-2">

        <div className="flex items-center gap-1.5">

          
        </div>

        </div>
      </div>
    </header>
  );
}