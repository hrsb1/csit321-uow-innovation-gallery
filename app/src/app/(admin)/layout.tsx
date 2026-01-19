//Author: Jonty Hourn
//Description: AuthLayout component for handling authentication and authorization in the admin section
"use client";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';

export default function AuthLayout({ children }: {
    readonly children: React.ReactNode;
}) {
    const router = useRouter();
    const [isAllowed, setIsAllowed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Detect mobile device by screen width
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const CheckUserGroup = async () => {
            try {
                const { tokens } = await fetchAuthSession();
                const groups = tokens?.accessToken.payload["cognito:groups"] || [];
                if (groups == ("ADMINS") || groups == ("Moderator")) {
                    setIsAllowed(true);

                }
                else{
                    setIsAllowed(false);
                }
                setIsLoading(false);

            }
            catch (error) {
                console.error("Error fetching user attributes:", error);
                await signOut();
                router.push('/signin');
            }
        }
        CheckUserGroup();
    }, [router]);
    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Spin size="large" /></div>;
    }
    return (
        <div>
            {isMobile && (
                <div className="fixed top-0 left-0 w-full bg-yellow-300 text-black text-center py-2 z-50">
                    For the best experience, please use a computer to access this page.
                </div>
            )}
            {!isAllowed &&
                <div className="flex justify-center items-center h-screen">
                    <p className="text-2xl font-bold text-red-500">You are not authorized to access this page.</p>
                    <button
                        className="ml-4 px-4 py-2 bg-blue-500 text-white rounded"
                        onClick={async () => {
                            await signOut();
                            router.push('/signin');
                        }}
                    >
                        Sign Out
                    </button>
                </div>
            }
            {isAllowed &&
                <div className='flex-grow font'>
                    <AntdRegistry>{children}</AntdRegistry>
                </div>
            }
        </div>

    );
}