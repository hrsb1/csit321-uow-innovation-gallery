//Author:
//Dilan wijemanne: Basic UI
//Jonty Hourn: Changes to make component to be more responsive
//Ian Cuchapin: UI Changes
//Description: Footer component for the UOW Online Innovation Gallery
import React from 'react';
import { Image } from 'antd';

const Footer: React.FC = () => {
    return (
        <footer className="border-t-[1px] border-gray-500 border-dashed border-b-transparent border-l-transparent border-r-transparent text-black h-auto md:h-[183px] flex flex-col md:flex-row justify-between">
            <div className="pl-[20px] md:pl-[40px] pt-[20px] md:pt-[30px]">
                <div className="flex flex-row md:items-start">
                    <Image src={'/images/icon.png'} className="h-[60px] md:h-[87px] w-[70px] md:w-[100px] max-w-[70px] max-h-[60px] md:max-w-[100px] md:max-h-[87px] mr-[10px] md:mr-[21px]" alt="UOW Logo" preview={false} />
                    <div className="border-l-[1px] border-[#001641] pl-[20px] md:pl-[35px] text-[18px] md:text-[24px] text-[#001641] font-extrabold">
                        UOW Online <br />Innovation Gallery
                    </div>
                </div>
                <div className="mt-[20px] md:mt-[25px]">
                    <div className="flex flex-col md:flex-row justify-center items-center space-y-[5px] md:space-y-0 md:space-x-[40px] mt-[10px] md:mt-[15px] text-[14px] md:text-[16px]">
                        <p className="m-0">&copy; 2024 UOW Online Innovation Gallery</p>
                        <a href="#" className="hover:text-gray-400">Terms</a>
                        <a href="#" className="hover:text-gray-400">Privacy</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;