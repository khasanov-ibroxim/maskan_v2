import React, {useEffect} from 'react';
import {Route, Routes} from "react-router-dom";
import FormMaskan from "./page/form_maskan/form_maskan.jsx";
import Login from "./page/login/login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Header from "./components/header.js";

import PropertyForm from "./components/PropertyForm.js";
import { Toaster } from "./components/ui/toaster";
import {AdminPanel} from "./components/AdminPanel.js";

const App = () => {
    useEffect(() => {
        const preventGesture = (e) => e.preventDefault();
        document.addEventListener("gesturestart", preventGesture);
        document.addEventListener("gesturechange", preventGesture);
        document.addEventListener("gestureend", preventGesture);
        return () => {
            document.removeEventListener("gesturestart", preventGesture);
            document.removeEventListener("gesturechange", preventGesture);
            document.removeEventListener("gestureend", preventGesture);
        };
    }, []);
    return (
        <>
            <Toaster/>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route path="/" element={
                    <ProtectedRoute>
                        <div className="min-h-screen bg-background">
                            <Header />
                            <main className="pb-safe">
                                <PropertyForm />
                            </main>
                        </div>
                    </ProtectedRoute>
                } />

                <Route path="/admin" element={
                    <ProtectedRoute requiredRole="admin">
                        <Header />
                        <AdminPanel />
                    </ProtectedRoute>
                } />
            </Routes>
        </>
    );
};

export default App;