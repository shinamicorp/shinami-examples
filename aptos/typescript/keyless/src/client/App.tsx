import "./App.css";
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/Home";
import TransactionPage from "./pages/TransactionPage";

function App() {

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/transaction" element={<TransactionPage />} />
      </Routes>
    </>
  );
};

export default App;
