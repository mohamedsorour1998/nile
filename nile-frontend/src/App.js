import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Navbar         from './components/Navbar';
import Footer         from './components/Footer';
import Home           from './components/Home';
import ProtectedRoute from './components/ProtectedRoute';

const SignIn   = React.lazy(() => import('./components/SignIn'));
const Register = React.lazy(() => import('./components/Register'));
const Feed     = React.lazy(() => import('./components/Feed'));
const Profile  = React.lazy(() => import('./components/Profile'));

const App = () => (
  <BrowserRouter>
    <Navbar />
    <main className="container mt-4">
      <React.Suspense fallback={<p>Loading...</p>}>
        <Routes>
          <Route path="/"         element={<Home />} />
          <Route path="/sign-in"  element={<SignIn />} />
          <Route path="/register" element={<Register />} />
          <Route path="/feed"     element={<ProtectedRoute component={Feed} />} />
          <Route path="/profile"  element={<ProtectedRoute component={Profile} />} />
        </Routes>
      </React.Suspense>
    </main>
    <Footer />
  </BrowserRouter>
);

export default App;
