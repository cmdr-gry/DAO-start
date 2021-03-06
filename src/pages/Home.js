import React, { useEffect, useState } from "react";
import "./pages.css";
import { TabList, Tab, Widget, Tag, Table, Form} from "web3uikit";
import { Link } from "react-router-dom";
import { useMoralis, useMoralisWeb3Api, useWeb3ExecuteFunction } from "react-moralis";

const Home = () => {
    const [passRate, setPassRate] = useState(0);
    const [totalP, setTotalP] = useState(0);
    const [counted, setCounted] = useState(0);
    const [voters, setVoters] = useState(0);
    const { Moralis, isInitialized } = useMoralis();
    const [proposals, setProposals] = useState([]);
    const Web3Api = useMoralisWeb3Api();
    const [sub, setSub] = useState();
    const contractProcessor = useWeb3ExecuteFunction();

    async function createProposal(newProposal) {
      let options = {
        contractAddress: "0xf248E2fd1cDD465d8bf626Ef171CF0780615F4e5",
        functionName: "createProposal",
        abi: [
          {"inputs":[{"internalType":"uint256","name":"_id","type":"uint256"}],
          "name":"countVotes","outputs":[],"stateMutability":"nonpayable","type":"function"},
          {"inputs":[{"internalType":"string","name":"_description","type":"string"},
          {"internalType":"address[]","name":"_canVote","type":"address[]"}],
          "name":"createProposal","outputs":[],"stateMutability":"nonpayable","type":"function"}
        ],
        params: {
         _description: newProposal,
         _canVote: voters,

        },
      };


      await contractProcessor.fetch({
        params: options,
        onSuccess: () => {
          console.log("Proposal Succesful");
          setSub(false);
        },
        onError: (error) => {
          alert(error.data.message);
          setSub(false);
        },
      });
    }

    async function getStatus(proposalId) {
      const ProposalCounts = Moralis.Object.extend("ProposalCounts");
      const query = new Moralis.Query(ProposalCounts);
      query.equalTo("uid", proposalId);
      const result = await query.first();
      if (result !== undefined) {
        if (result.attributes.passed) {
          return { color: "green", text: "Passed"};
        } else {
          return { color: "red", text: "Rejected"};
        } 
        } else {
          return { color: "blue", text: "Ongoing"};
        }
      }
    
      useEffect(() => {
        if (isInitialized) {
         
          async function getProposals() {
            const Proposals = Moralis.Object.extend("Proposals");
            const query = new Moralis.Query(Proposals);
            query.descending("uid_decimal");
            const results = await query.find();
            const table = await Promise.all(
              results.map(async (e) => [
                e.attributes.uid,
                e.attributes.description,
                <Link to="/proposal" state={{
                  description: e.attributes.description,
                  color: (await getStatus(e.attributes.uid)).color,
                  text: (await getStatus(e.attributes.uid)).text,
                  id: e.attributes.uid,
                  proposer: e.attributes.proposer
                }}>
                  <Tag
                  color={(await getStatus(e.attributes.uid)).color}
                  text={(await getStatus(e.attributes.uid)).text}
                  />
                </Link>
              ])
            );
            setProposals(table);
            setTotalP(results.length);
          }

          async function getPassRate() {
            const ProposalCounts = Moralis.Object.extend("ProposalCounts");
            const query = new Moralis.Query(ProposalCounts);
            const results = await query.find();
            let votesUp = 0;

            results.forEach((e) => {
              if (e.attributes.passed) {
                votesUp++;
              }
            });

            setCounted(results.length);
            setPassRate((votesUp / results.length) * 100);
          }
          
          const fetchTokenIdOwners = async () => {
            const options = {
              address: "0xf248E2fd1cDD465d8bf626Ef171CF0780615F4e5",
              token_id: "27786481537732974762883642649399849858069577819208085100122520217913145688164",
              chain: "mumbai",
            };
            const TokenIdOwners = await Web3Api.token.getTokenIdOwners(options);
            const addresses = TokenIdOwners.result.map((e) => e.owner_of);
            setVoters(addresses);
          };

          fetchTokenIdOwners();
          getProposals();
          getPassRate();
        }
      }, [isInitialized]);

  return (
    <>
      <div className="content">
        <TabList defaultActiveKey={1} tabStyle="bulbUnion">
          <Tab tabKey={1} tabName="DAO"></Tab>
          {proposals && (
          <div className="tabContent">
            Governance Overview
            <div className="widgets">
              <Widget
                   info={totalP}
                   title="Proposals Created"
                   style={{ width: "200%" }}
                   >
                  <div className="extraWidgetInfo">
                    <div className="extraTitle">Pass Rate</div>
                    <div className="progress">
                      <div
                      className="progressPercentage"
                      style={{ width: `${passRate}%` }}
                    ></div>
                    </div>
                  </div>

                   </Widget>
                   <Widget info={voters.length} title="Eligible Voters" />
                   <Widget info={totalP-counted} title="Ongoing Proposals" />
            </div>
           Recent Proposals
           <div style={{ marginTop: "30px" }}>
             <Table
                 columnsConfig="10% 70% 20%"
                 data={proposals}
                 header={[
                   <span>ID</span>,
                   <span>Description</span>,
                   <span>Status</span>,
                 ]}
                 pageSize={5}
                 />
           </div>
            <Form
            buttonConfig={{
              isLoading: sub,
              loadingText: "Submitting Proposal",
              text: "Submit",
              theme: "secondary",
            }}
            data={[
              {
                inputWidth: "100%",
                name: "New Proposal",
                type: "textarea",
                validation: {
                  required: true,
                },
                value: "",
              },
              ]}
              onSubmit={(e) => {
                setSub(true);
                createProposal(e.data[0].inputResult);
              }}
              title="Create a New Proposal"
              />
              
          </div>
          )}
          <Tab tabKey={2} tabName="Forum"></Tab>
          <Tab tabKey={3} tabName="Docs"></Tab>
        </TabList>
      </div>
      <div className="voting"></div>
    </>
  );
};

export default Home;
