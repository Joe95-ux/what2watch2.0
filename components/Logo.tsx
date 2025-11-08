"use client";
import { AlignEndVertical } from "lucide-react";
import {cn} from "@/lib/utils";
import React from "react";
import Link from "next/link";

export default function Logo({fontSize= "2xl", iconSize=18}:{fontSize?: string, iconSize?: number}){
 return(
  <Link href="/">
    <div className={cn("text-lg font-extrabold flex items-center gap-2", fontSize)}>
      
      <div className="rounded bg-gradient-to-r from-[#066f72] to-[#0d9488] p-1">
        <AlignEndVertical size={iconSize} className="stroke-white" />
      </div>
      <div>
        <span className="bg-gradient-to-r from-[#066f72] to-[#0d9488] bg-clip-text text-transparent">
          What2watch
        </span>
      </div>
      
    </div>
  </Link>
 )
}