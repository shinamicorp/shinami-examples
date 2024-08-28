import "./App.css";
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/Home";
import TransactionPage from "./pages/TransactionPage";
import GoogleCallbackPage from "./pages/GoogleCallback";

function App() {

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/transaction" element={<TransactionPage />} />
        <Route path="/googlecallback" element={<GoogleCallbackPage />} />
      </Routes>
    </>
  );
};

export default App;
