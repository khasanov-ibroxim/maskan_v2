import React from 'react';
import {Route, Routes} from "react-router-dom";
import FormMaskan from "./page/form_maskan/form_maskan.jsx";
import Login from "./page/login/login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Header from "./components/Header.jsx";
import AdminPanel from "./page/admin/adminPanel.jsx";

const App = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={
                <ProtectedRoute>
                    <Header />
                    <FormMaskan />
                </ProtectedRoute>
            } />

            <Route path="/admin" element={
                <ProtectedRoute requiredRole="admin">
                    <Header />
                    <AdminPanel />
                </ProtectedRoute>
            } />
        </Routes>
    );
};

export default App;