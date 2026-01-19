//Author
//Dilan wijemanne, Ian Cuchapin: UI, functionality.
//Jonty Hourn: Added new Section.
//Description: Home page for the admin section of the website.
"use client";
import { IoMdArrowDropdown, IoMdArrowDropright } from "react-icons/io";
import { useState } from "react";
import { ProjectsTable } from "./projectsTable";
import { ClientsTable } from "./clientsTable";
import { StudentsTable } from "./studentsTable";
import { UploadCSVPage } from "./uploadcsv";
import { DegreeTable } from "./Degree";
import { TagTable } from "./Tag";
import {ResonTable} from "./ContateReson"
import { Input } from 'antd';

const { Search } = Input;

interface DropdownProps {
    title: string;
    items: string[];
    onSelect: (item: string) => void;
    selectedItem: string;
}

const Dropdown: React.FC<DropdownProps> = ({ title, items, onSelect, selectedItem }) => {
    const [isOpen, setIsOpen] = useState<boolean>(true);

    const toggleDropdown = () => setIsOpen(!isOpen);

    const handleSelect = (item: string) => {
        const fullItem = `${item.split(' ')[0]} ${title}`;
        onSelect(fullItem);
    };

    return (
        <div className="relative inline-block mb-4 mr-6 ">
            <span
                onClick={toggleDropdown}
                className="text-[#001641] font-montserrat text-[20px] font-bold flex items-center cursor-pointer"
            >
                {isOpen ? <IoMdArrowDropright /> : <IoMdArrowDropdown />}
                {title}
            </span>
            {isOpen && (
                <ul className="mt-2 list-none">
                    {items.map((item) => {
                        const fullItem = `${item.split(' ')[0]} ${title}`;
                        const isSelected = selectedItem === fullItem;

                        return (
                            <li
                                key={item}
                                onClick={() => handleSelect(item)}
                                className={`cursor-pointer px-4 py-2 ${
                                    isSelected ? "text-[#03F] font-bold" : "text-black"
                                }`}
                            >
                                {item}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

const Home: React.FC = () => {

    const [currentScreen, setCurrentScreen] = useState<string>("Pending Projects");
    const [selectedItem, setSelectedItem] = useState<string>("Pending Projects");
    const [searchTerm, setSearchTerm] = useState<string>('');

    const onSearch = (value: string) => {
        setSearchTerm(value);
    };

    const renderPage = ({ currentScreen }: { currentScreen: string }) => {
        const section = currentScreen.split(" ")[1];
        switch (section) {
            case 'Projects':
                return <ProjectsTable name={currentScreen} searchTerm={searchTerm} />;
            case 'Clients':
                return <ClientsTable name={currentScreen} searchTerm={searchTerm} />;
            case 'Students':
                return <StudentsTable searchTerm={searchTerm} />;
            case 'Tools':
                if (currentScreen === "Upload Tools") {
                    return <UploadCSVPage />;
                } else if (currentScreen === "Degree Tools") {
                    return <DegreeTable />;
                }
                else if (currentScreen === "Tag Tools") {
                    return <TagTable />;
                }
                else if (currentScreen === "Reason Tools"){
                    return <ResonTable/>;
                }
            default:
                return <div>Not Found</div>;
        }
    };

    const handleSelection = (value: string) => {
        setSelectedItem(value);
        setCurrentScreen(value);
    };
    return (
        <div className=" flex">
            <div className="flex-1 border-r-2 border-solid border-black border-t-0 border-b-0 border-l-0">
                <div className="pl-[45px] pt-[10vh] flex flex-col text-[#001641]">
                    <Dropdown
                        title="Projects"
                        items={["Pending Projects", "Approved Projects","PendingEdit Projects",  "Rejected Projects"]}
                        onSelect={handleSelection}
                        selectedItem={selectedItem}
                    />
                    <Dropdown
                        title="Clients"
                        items={["New Clients", "Pending Clients", "Closed Clients", "Rejected Clients"]}
                        onSelect={handleSelection}
                        selectedItem={selectedItem}
                    />
                    <Dropdown
                        title="Students"
                        items={["User Management"]}
                        onSelect={handleSelection}
                        selectedItem={selectedItem}
                    />
                    <Dropdown
                        title="Tools"
                        items={["Upload CSV", "Degree Management","Reason Management","Tag Management"]}
                        onSelect={handleSelection}
                        selectedItem={selectedItem}
                    />
                </div>
            </div>
            <div className="flex-[4.56]">
                {currentScreen !== "Upload Tools" && (
                    <div className="flex justify-between items-center mx-[55px] mt-[50px] pr-[10px]">
                    <span className="block text-[22px] font-bold text-[#001641]">{currentScreen}</span>
                    <Search
                        placeholder="Search"
                        allowClear
                        onSearch={onSearch}
                        style={{ width: 400, borderRadius: 0 }}
                    />
                    </div>
                )}
                <div className="pl-[30px] pr-[40px]">
                    {renderPage({ currentScreen })}
                </div>
            </div>
        </div>
    );
};

export default Home;
