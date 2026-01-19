//Author:
//Ian Cuchapin: UI
//Dlian Wijemann Wijemanne: Filtering and Pagination
//Jonty Hourn: Aws Amplify Integration
//Description: ClientsTable component for displaying and managing client.
import React, { useState, useEffect } from 'react';
import { FaCommentDots, FaArrowsAlt } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { SortAscendingOutlined } from "@ant-design/icons";
import { generateClient } from 'aws-amplify/data';
import { type Schema } from '../../../../amplify/data/resource';

const clientDB = generateClient<Schema>();

// Define types for props and data
type Client = Schema["InvestorInterest"]["type"];

interface ClientsTableProps {
    name: string;
    searchTerm: string;
}


export const ClientsTable: React.FC<ClientsTableProps> = ({ name, searchTerm }) => {
    const statusColors: Record<string, string> = {
        New: 'bg-[#ED0A00] min-w-[100px] hover:opacity-70',
        Viewed: 'bg-[#0033FF] min-w-[100px] hover:opacity-70',
        'Email Student': 'bg-yellow-300 text-black min-w-[100px] hover:opacity-70',
        Unassigned: 'bg-fuchsia-400 min-w-[100px] hover:opacity-70',
        Assigned: 'bg-cyan-300 w-[100px] hover:opacity-70',
        'Needs Verification': 'bg-slate-500 text-white min-w-[100px] hover:opacity-70',
        Closed: 'bg-violet-900 text-white min-w-[100px] hover:opacity-70',
        Lost: 'bg-black text-white min-w-[100px] hover:opacity-70',
    };

    const [data, setData] = useState<Client[]>([]);
    const [openStatusIndex, setOpenStatusIndex] = useState<number | null>(null);
    const [editCommentIndex, setEditCommentIndex] = useState<number | null>(null);
    const [editedComment, setEditedComment] = useState<string>("");
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [nextToken, setNextToken] = useState<string | null>(null);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [pageTokens, setPageTokens] = useState<(string | null)[]>([null]);
    const [hasMorePages, setHasMorePages] = useState(true);
    const [isMoveModalOpen, setIsMoveModalOpen] = useState<boolean>(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
   

    const allStatusOptions = Object.keys(statusColors);
    const allCategories = clientDB.enums.InvestorInterestStatusCatagory;

    const handleSortByStatus = () => {
        const sortedData = [...data].sort((a, b) => {
            if (sortDirection === 'asc') {
                return (a.statusCatagory ?? '').localeCompare(b.statusCatagory ?? '');
            } else {
                return (b.statusCatagory ?? '').localeCompare(a.statusCatagory ?? '');
            }
        });
        setData(sortedData);
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    };

    const fetchClientData = React.useCallback(async (token: string| null): Promise<void> => {
   
            const filter = name.split(" ")[0];
            const {data: Client, nextToken: newNextToken, errors} = await clientDB.models.InvestorInterest.list({filter: {and: [ {statusCatagory: {eq: filter}}, {or: [{investorName: {contains: searchTerm}}, {investorCompany: {contains:name}}, {investorEmail: {contains:searchTerm}}, {investorPhone: {contains:searchTerm}}]}]}  ,
                nextToken: token,
                limit: 15, // Limit results per page
                authMode: "userPool"});
            if (!errors){
                setData(Client as Client[]);
                setNextToken(newNextToken ?? null);
                if (!newNextToken) setHasMorePages(false);
            }

        
    }
    , [searchTerm, name]);

    useEffect(() => {
        fetchClientData(pageTokens[currentPageIndex]);
    }, [searchTerm, currentPageIndex, pageTokens, fetchClientData]);


    const handleNextPage = () => {
        if (hasMorePages && currentPageIndex === pageTokens.length - 1) {
            setPageTokens([...pageTokens, nextToken]);
        }
        if (hasMorePages) {
            setCurrentPageIndex(currentPageIndex + 1);
        }
    };

    const handlePreviousPage = () => {
        if (currentPageIndex > 0) {
            setCurrentPageIndex(currentPageIndex - 1);
            setHasMorePages(true);
        }
    };

    const router = useRouter();

    const moveClient = (client: Client, targetCategory: string) => {
        clientDB.models.InvestorInterest.update({
            id: client.id,
            statusCatagory: targetCategory as 'New' | 'Pending' | 'Closed' | 'Rejected',
        }, { authMode: "userPool" })
        .then(() => {
            fetchClientData(pageTokens[currentPageIndex]);
        });
    };

    const openMoveModal = (client: Client) => {
        setSelectedClient(client);
        setIsMoveModalOpen(true);
    };

    const closeMoveModal = () => {
        setIsMoveModalOpen(false);
        setSelectedClient(null);
    };

    const handleMoveOptionClick = (targetCategory: string) => {
        if (selectedClient) {
            moveClient(selectedClient, targetCategory);
        }
        closeMoveModal();
    };



    function updateStatus(index: number, statusOption: string): void {
        const updatedData = [...data];
        const clientToUpdate = updatedData[index];

        if (clientToUpdate) {
            clientDB.models.InvestorInterest.update(
                {
                    id: clientToUpdate.id,
                    status: statusOption,
                },
                { authMode: "userPool" }
            )
            .then(() => {
                clientToUpdate.status = statusOption;
                setData(updatedData);
            })
            .catch((error) => {
                console.error("Error updating client status:", error);
            });
        }
    }
    return (
        <div className="p-6">
            <table className="min-w-full border-collapse border border-gray-600">
                <thead>
                    <tr className="bg-gray-500 border-b border-gray-600 text-white">
                    <th className="w-[25%] px-4 py-2 text-center border-r border-gray-600">Client Name</th>
                    <th className="w-[25%] px-4 py-2 text-center border-r border-gray-600">Email</th>
                    <th
                        className="w-[15%] px-4 py-2 text-center border-r border-gray-600 cursor-pointer hover:bg-gray-300"
                        onClick={handleSortByStatus}
                    >
                        Status <SortAscendingOutlined />
                    </th>
                    <th className="w-[15%] px-4 py-2 text-center border-r border-gray-600">Client Form</th>
                    <th className="w-[10%] px-4 py-2 text-center border-r border-gray-600">Comments</th>
                    <th className="w-[10%] px-4 py-2 text-center">Move Project</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((client, index) => (
                    <tr 
                        key={index} 
                        className={`relative border-t border-gray-600 ${index % 2 !== 0 ? 'bg-gray-300' : 'bg-gray-100'}`}
                    >
                        {/* Client Name */}
                        <td className="w-[25%] px-4 py-2 text-center border-r border-gray-600">{client.investorName}</td>

                        {/* Client Email */}
                        <td className="w-[25%] px-2 py-2 border-r border-gray-600 text-center underline text-blue-600">
                        {client.investorEmail}
                        </td>
                        
                        {/* Client status */}
                        <td className="w-[15%] px-4 py-2 border-r border-gray-600">
                        <div className="flex justify-center">
                            <button
                            onClick={() => setOpenStatusIndex(openStatusIndex === index ? null : index)}
                            className={`text-sm text-white font-bold px-2 py-1 whitespace-nowrap max-w-[150px] border-none rounded-none cursor-pointer ${statusColors[client.status ?? '']}`}
                            >
                            {client.status}
                            </button>
                            {openStatusIndex === index && (
                            <div className="absolute z-10 mt-10 bg-white border w-40 p-2 flex flex-col items-center">
                                <div className="bg-gray-200 border gap-1 w-40 p-4 flex flex-col items-center">
                                {allStatusOptions.map((statusOption) => (
                                    <div
                                        key={statusOption}
                                        onClick={() => updateStatus(index, statusOption)}
                                        className={`cursor-pointer px-3 py-1 mb-1 text-sm text-center hover:opacity-70 ${statusColors[statusOption]}` }
                                    >
                                        {statusOption}
                                    </div>
                                ))}
                                </div>
                            </div>
                            )}
                        </div>
                        </td>

                        {/* Client Form */}
                        <td className="w-[15%] px-2 py-2 border-r border-gray-600">
                        <div className="flex justify-center items-center w-full h-full">
                            <span
                            className="text-sm text-white font-bold bg-[#0033FF] px-2 py-1 border-none rounded-none cursor-pointer hover:opacity-70"
                            onClick={() => router.push('/adminClientForm?investid=' + client.id)}
                            >
                            View Form
                            </span>
                        </div>
                        </td>

                        {/* Comment Column */}
                        <td className="w-[10%] px-2 py-2 text-center relative">
                            <div
                                className="flex justify-center cursor-pointer"
                                onClick={() => {
                                setEditCommentIndex(index);
                                setEditedComment(client.ModComments || '');
                                }}
                            >
                            
                                <FaCommentDots className="text-lg text-gray-700 hover:text-blue-500" />
                            </div>

                            {editCommentIndex === index && (
                                <div className="absolute z-20 bg-gray-200 border p-4 w-80 min-h-32 top-full left-1/2 transform -translate-x-1/2 mt-2">
                                <textarea
                                    value={editedComment}
                                    placeholder="Add a comment..."
                                    onChange={(e) => setEditedComment(e.target.value)}
                                    className="min-w-80 max-w-80 max-h-64 text-sm whitespace-normal word-wrap-break-word focus:outline-none"
                                    rows={5}
                                    autoFocus
                                />
                                <div className="flex justify-end space-x-2 mt-2">
                                    <button
                                        className="text-sm text-white font-bold bg-[#0033FF] px-2 py-1 border-none rounded-none cursor-pointer"
                                        onClick={() => {
                                            clientDB.models.InvestorInterest.update({
                                                id: client.id,
                                                ModComments: editedComment,
                                            },{ authMode: "userPool" })
                                            .then(() => {
                                                const updatedData = [...(data || [])];
                                                updatedData[index].ModComments = editedComment;
                                                setData(updatedData);
                                            });
                                            setEditCommentIndex(null);
                                        }}
                                    >
                                        Save
                                    </button>
                                    <button
                                        className="text-sm text-white font-bold bg-[#ED0A00] px-2 py-1 border-none rounded-none cursor-pointer"
                                        onClick={() => setEditCommentIndex(null)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                            )}
                        </td>

                        {/* Moving Client Column */}
                        <td className="w-[10%] px-2 py-2 border-r border-gray-600 text-center">
                            <div
                                className="cursor-pointer text-gray-700 hover:text-blue-500"
                                onClick={() => openMoveModal(client)}
                            >
                                <FaArrowsAlt className="text-lg mx-auto" /> {/* Move icon */}
                            </div>
                        </td>
                    </tr>
                    ))}
                </tbody>
            </table>
            <div className="flex justify-center mt-4 gap-4">
                <button
                    className="w-32 bg-[#0033FF] hover:enabled:bg-[#ED0A00] font-bold text-white border-none px-5 py-3 gap-4 disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed"
                    onClick={handlePreviousPage}
                    disabled={currentPageIndex === 0}
                >
                    Previous
                </button>
                <button
                    className="w-32 bg-[#0033FF] hover:enabled:bg-[#ED0A00] font-bold text-white border-none px-5 py-3 gap-4 disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed"
                    onClick={handleNextPage}
                    disabled={!hasMorePages}
                >
                    Next
                </button>
            </div>

            {/* Moving Client Implementation */}
            {isMoveModalOpen && selectedClient && (
                <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-30" onClick={closeMoveModal}>
                    <div className="bg-white p-6 w-80 z-40" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-2xl text-[#001641] mb-4">Move Client To</h2>
                        {[...allCategories.values()].map((category) => (
                            <button
                                key={category}
                                onClick={() => handleMoveOptionClick(category)}
                                className="block w-full py-2 px-4 text-left font-bold text-white bg-[#0033FF] rounded-none mb-3 border-none cursor-pointer"
                            >
                                {category}
                            </button>
                        ))}
                        <button onClick={closeMoveModal} className="block w-full py-2 px-4 text-center font-bold text-white bg-[#ED0A00] rounded-none mb-3 mt-10 border-none cursor-pointer">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            
        </div>
    );
};
