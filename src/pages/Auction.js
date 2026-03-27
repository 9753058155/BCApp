import { useEffect, useState, useContext } from "react";
import { db } from "../firebase/config";
import { ref, onValue, update } from "firebase/database";
import { AuthContext } from "../context/AuthContext";

export default function Auction() {
  const [auction, setAuction] = useState(null);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const auctionRef = ref(db, "auction");

    onValue(auctionRef, (snapshot) => {
      setAuction(snapshot.val());
    });
  }, []);

  const placeBid = () => {
    if (!auction.isLive) return;

    update(ref(db, "auction"), {
      currentBid: auction.currentBid + 10,
      bidder: user.uid
    });
  };

  if (!auction) return <div>Loading...</div>;

  return (
    <div className="container">
      <h1>Auction</h1>

      {!auction.isLive && <p>Auction not live</p>}

      {auction.isLive && (
        <>
          <p>Current Bid: {auction.currentBid}</p>
          <button onClick={placeBid}>Bid +10</button>
        </>
      )}
    </div>
  );
}