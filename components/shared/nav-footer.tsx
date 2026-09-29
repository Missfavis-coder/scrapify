"use client";

import Link from "next/link";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { useSidebar } from "../ui/sidebar";
import { PiArrowRightBold } from "react-icons/pi";


const NavSettings = () => {
  const { state } = useSidebar();

  if (state === "collapsed") {
    return (
      <div className="flex flex-col items-center gap-3 p-2">
        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-medium">
          OA
        </div>
      </div>
    );
  }

  return ( 
    <Card className="w-full py-6 px-4 bg-[#fef29e]/40 text-white ">

      <div className="space-y-1">
        <h1 className=" text-[14px] text-neutral-700 text-center tracking-wide" >
        ofavourmi55@gmail.com
        </h1>
      </div>

      <div className=" ">
        <Button
          variant="ghost"
          className="w-full text-sm font-bold text-center cursor-pointer gap-2 text-secondary  bg-white rounded-md hover:bg-white "
        >
            <PiArrowRightBold className="size-3 text-white" />
            <Link href="/">Log Out</Link>
          
        </Button>
      </div>
    </Card>
  );
};

export default NavSettings;