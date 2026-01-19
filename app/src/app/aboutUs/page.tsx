//Author: Dilan Wijemanne: Whole page
// Description: This is the About Us page for the UOW Innovation Gallery
import React from 'react';
import Image from 'next/image';



function AboutUsPage() {
  

  return (
    <div className = "w-full">
      <div className="relative w-full h-[400px] md:h-[500px] overflow-hidden">
        <Image
          src="/images/AboutCoverPage.png"
          alt="Home"
          fill
          className="object-cover"
          quality={100}
          priority
        />
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-start pl-6 md:pl-40">
          <h1 className="text-white text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-bold text-left leading-tight">
            <span className="block mb-2 md:mb-4">
              <span className="bg-[#ED0A00] px-2 py-1 md:px-4 md:py-1 rounded">About</span> UOW
            </span>
            <span className="block ml-1 md:ml-2 mb-2 md:mb-4">Innovation Gallery</span>
          </h1>
        </div>
      </div>
      <div className = "px-10 flex flex-col items-center justify-center space-y-6 mb-20 mt-20">
        <div>
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold text-[#0033FF]">
              Student Intellectual Property at UOW
            </h2>
            <p className="text-[#001641] text-lg leading-relaxed text-justif">
              At the <b>University of Wollongong (UOW)</b>, we are proud to foster a vibrant culture of creativity,<br/>
              research, and innovation. As a student at UOW, the work you produce — <br/>
              whether it&apos;s a research paper, a design, software code, or a startup concept — is a vital part of your academic journey and could hold real-world impact.<br/>
              We’re here to ensure you understand your <b>intellectual property (IP) rights</b> and how to protect, manage, and benefit from your original work.
            </p>
          </div>
          <br/>
          <hr/>
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold text-[#0033FF]">
              Our Commitment
            </h2>
              UOW is committed to:<br/>
              <ul className = "list-inside pl-4 text-lg leading-relaxed">
                <li>Supporting student innovation and entrepreneurship</li>
                <li>Clarifying ownership and IP rights in various academic contexts</li>
                <li>Providing resources and expert guidance on IP management</li>
              </ul>
              Whether you’re working independently, collaborating with peers, or contributing to a research project, we want you to feel confident about your creative ownership and its potential applications.
          </div>
          <br/>
          <hr/>
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold text-[#0033FF]">
              What is Student Intellectual Property?
            </h2>
              Student IP refers to original works created by UOW students in the course of their academic activities. This can include:
              <ul className = "list-inside pl-4 text-lg leading-relaxed">
                <li>Research projects, theses, and dissertations</li>
                <li>Artistic and creative works</li>
                <li>Software, algorithms, and digital products</li>
                <li>Business plans and innovations</li>
                <li>Prototypes, models, or lab-developed inventions</li>
              </ul>
              <br/>
                In most cases at UOW, <b>students retain ownership</b> of their intellectual property unless:
              <ul className = "list-inside pl-4 text-lg leading-relaxed">
                <li>They are part of a funded research program or scholarship with specific IP terms</li>
                <li>They use significant university resources (beyond standard facilities)</li>
                <li>IP agreements exist with collaborators or external partners</li>
              </ul>
              <br/>
                To understand the full details, view our <a href = "https://www.uow.edu.au/industry/">UOW IP Policy for Students.</a>
          </div>
          <br/>
          <hr/>
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold text-[#0033FF]">
              Why Understanding IP Matters
            </h2>
              Your intellectual property can have long-term value — academically, personally, and commercially. Knowing your rights helps you:
              <ul className = "list-inside pl-4 text-lg leading-relaxed">
                <li>Maintain control over how your work is used</li>
                <li>Protect your ideas from misuse</li>
                <li>Explore opportunities for licensing or commercialization</li>
                <li>Collaborate effectively and fairly with others</li>
                </ul>
          </div>
          <br/>
          <hr/>
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold text-[#0033FF]">
              UOW Support for Student IP
            </h2>
              UOW offers a range of resources to help students navigate the IP landscape:
              <ul className = "list-inside pl-4 text-lg leading-relaxed">
                <li><b>Workshops and Seminars:</b> Learn about copyright, patents, trademarks, and more</li>
                <li><b>IP Advice and Legal Guidance:</b> Access consultations through the <a href = "https://www.uow.edu.au/industry/" >Innovation & Commercial Research Unit</a></li>
                <li><b>Entrepreneurship Programs:</b> Join initiatives like iAccelerate to turn your ideas into ventures</li>
                <li><b>Collaboration Opportunities:</b> Connect with faculty, industry partners, or fellow students</li>
              </ul>
          </div>
          <br/>
          <hr/>
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold text-[#0033FF]">
              Have a Question or Idea?
            </h2>
            <p className="text-[#001641] text-lg leading-relaxed text-justif">
              If you’re working on something you think has IP potential, or you just want to learn more, we encourage you to:<br/>
              <b>📩 Contact:</b> Industry and student engagement<br/>
              <b>🤝 Engage:</b> Attend upcoming workshops or book a 1-on-1 consultation<br/>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AboutUsPage;