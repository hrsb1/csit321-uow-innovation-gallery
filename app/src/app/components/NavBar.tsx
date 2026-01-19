//Author: 
//Dilan wijemanne: Basic UI
//Jonty Hourn: Changes to make component to be more responsive
// Ian Cuchapin: UI Changes
'use client';
import React, { useEffect, useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import config from "@/../amplify_outputs.json";
Amplify.configure(config, { ssr: true });
import { Button, Image } from 'antd';
import { MenuOutlined, CloseOutlined } from '@ant-design/icons';

const NavBar: React.FC = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const { tokens } = await fetchAuthSession();
                const groups = tokens?.accessToken.payload["cognito:groups"] || [];
                if (groups == ("ADMINS")) {
                    setIsAdmin(true);
                }
            } catch {
            }
        };
        checkAdmin();
    }, []);

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    return (
        <div>
            <header className="bg-white p-[20px] px-[60px] flex justify-between items-center">
                <a href='/' className="flex items-center gap-[10px] no-underline">
                    <Image src={`/images/50years.svg`} alt='logo image' width={240} preview={false}/>
                </a>
                <div className="flex items-center gap-[20px] mt-[10px] md:mt-0">
                    <a href="/gallery" className="text-[#001641] hover:text-[#ED0A00] font-bold no-underline hidden md:block">GALLERY</a>
                    <a href="/aboutUs" className="text-[#001641] hover:text-[#ED0A00] font-bold no-underline hidden md:block">ABOUT</a>
                    {isAdmin && (
                        <a href='/admin' className="text-[#001641] hover:text-[#ED0A00] font-bold no-underline hidden md:block">ADMIN</a>
                    )}
                    <a href='/account' className='hidden md:block'><Image src={'/images/UserIcon.png'} alt="Profile" height={40} width={40} className=" rounded-full" preview={false} /></a>
                </div>
                <div className=" md:hidden">
                <Button 
                    className=" text-[1.5rem] " 
                    onClick={toggleMenu}
                    aria-label="Toggle menu"
                >
                    {menuOpen ? <CloseOutlined /> : <MenuOutlined />}
                </Button>
                </div>
            </header>
            <div className={`bg-[#002145] text-white flex-col items-center gap-[20px] p-[20px] ${menuOpen ? 'flex' : 'hidden'} md:hidden`}>
                <a href="/gallery" className="text-white no-underline">Gallery</a>
                <a href="/aboutUs" className="text-white no-underline">About</a>
                {isAdmin && (
                    <a href='/admin' className="text-white no-underline">Admin</a>
                )}
                <a href='/account' className="text-white no-underline">
                    Account
                </a>
            </div>
            
        </div>
    );
};

export default NavBar;
