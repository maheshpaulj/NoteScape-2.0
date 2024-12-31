import HomeNavbar from "@/components/HomeNavbar"

const RootLayout = ({ children } : { children: React.ReactNode}) => {
    return (
        <div className="h-full dark:bg-[#1e1e1e] dark:text-white">
            <HomeNavbar />
            <main className="h-full pt-40">
                {children}
            </main>
        </div>
    )
}

export default RootLayout;