import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { StudentProvider } from './context/StudentContext'
import StudentSelect from './pages/StudentSelect'
import ChatPage from './pages/ChatPage'
import QuizPage from './pages/QuizPage'
import DashboardLogin from './pages/DashboardLogin'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  return (
    <StudentProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<StudentSelect />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/dashboard/login" element={<DashboardLogin />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </BrowserRouter>
    </StudentProvider>
  )
}
