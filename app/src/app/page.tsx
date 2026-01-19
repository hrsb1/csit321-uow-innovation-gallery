//Author: Ian Cuchapin
//Description: Home page for the UOW Online Innovation Gallery.
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="w-full">
      {/* Hero Image */}

      <div className="relative w-full h-[300px] md:h-[400px] lg:h-[500px] overflow-hidden">
        <Image
          src="/images/iAccerelate.jpg"
          alt="Home"
          fill
          className="object-cover"
          quality={100}
          priority
        />
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center md:justify-start px-4 md:pl-20">
          <h1 className="text-white text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-bold text-left leading-tight drop-shadow-md">
            <span className="block mb-2 sm:mb-4">
              <span className="bg-[#ED0A00] px-2 sm:px-4 py-1 rounded">Welcome</span> to the
            </span>
            <span className="block ml-1 sm:ml-2 mb-2 sm:mb-4">UOW Innovation</span>
            <span className="block ml-1 sm:ml-2">Gallery</span>
          </h1>
        </div>
      </div>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[2fr_1px_1fr] gap-20 px-20 py-20 mt-32 mb-32 bg-gray-100">
        {/* Left Section */}
        <div className="space-y-6">
          <h2 className="text-3xl font-extrabold text-[#ED0A00]">
            What is UOW Innovation Gallery?
          </h2>
          <p className="text-[#001641] text-lg leading-relaxed ">
            Welcome to the University of Wollongong Student IP (Intellectual Property) Gallery — a dynamic showcase of the creativity, innovation, and ingenuity of our students. This space highlights original works developed as part of academic research, entrepreneurship initiatives, class projects and capstone designs.
            <br /><br />At the University of Wollongong, we believe in empowering students to take their ideas from concept to creation — and beyond. The Student IP Gallery celebrates this journey by recognising intellectual achievements across diverse fields including technology, science, arts, business, and social innovation.
            <br /><br />We&apos;re proud to showcase the groundbreaking work of our student innovators, creators, and entrepreneurs. The IP Gallery highlights original projects and we encourage you to have a look.
            <br /><br />The purpose is to connect our students to investors, industry and the community who may be searching for the next big idea.
          </p>
          <div className="flex justify-start">
            <a
              href="/gallery"
              className="text-[#0033FF] font-semibold no-underline text-lg hover:text-[#ED0A00] gap-4 flex"
            >
              EXPLORE THE GALLERY <span className="text-2xl leading-none font-semibold">›</span>
            </a>
          </div>

        </div>

        {/* Separator */}
        <div className="hidden lg:block h-full w-px bg-gray-300 mx-auto"></div>

        {/* Right Section */}
        <div className="space-y-6">
          <h2 className="text-3xl font-extrabold text-[#ED0A00]">
            Are you a UOW Student?
          </h2>
          <p className="text-[#001641] text-lg leading-relaxed">
            Sign up to contribute your own projects or explore what others have built. The Innovation Gallery is your platform to innovate, showcase, and collaborate.
          </p>
          <div className="flex flex-col">
            <div className="flex justify-start">
              <button
                onClick={() => router.push("/signin")}
                className="bg-[#0033FF] text-white border-none font-bold hover:bg-[#ED0A00] px-5 py-3 cursor-pointer gap-4 flex"
              >
                SIGN IN
              </button>
            </div>
            <div className="flex items-center gap-2 -mt-3">
              <p className="text-[#001641] text-lg flex">Don&apos;t have an account yet? </p>
              <a
                href="/signup"
                className="text-[#0033FF] font-semibold text-lg hover:text-[#ED0A00] gap-4 flex"
              >
                Register here
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
    )  
}
