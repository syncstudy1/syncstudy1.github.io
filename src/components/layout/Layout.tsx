import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
export function Layout() { return <div className="app-bg"><Navbar /><main className="page-content min-h-screen"><Outlet /></main><Footer /></div> }
