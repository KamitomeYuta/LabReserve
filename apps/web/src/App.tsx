import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpen,
  Box,
  CalendarDays,
  ChevronRight,
  FlaskConical,
  LogOut,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { User } from '../../../packages/contracts/src/index.js';
import { api, ApiError } from './api.js';
import { ErrorNotice, Loading } from './components.js';
import { EquipmentList, EquipmentDetail, AdminEquipment } from './pages/Equipment.js';
import { ReservationList, ReservationDetail } from './pages/Reservations.js';
function Auth({ onLogin }: { onLogin: (u: User) => void }) {
  const [register, setRegister] = useState(false),
    [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    setBusy(true);
    setError(undefined);
    try {
      onLogin(
        (
          await api<{ user: User }>(`/auth/${register ? 'register' : 'login'}`, 'POST', {
            email: d.get('email'),
            password: d.get('password'),
          })
        ).user,
      );
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <Link to="/" className="brand">
          <FlaskConical />
          <span>
            lab<span className="brand-light">reserve</span>
            <i />
          </span>
        </Link>
        <div className="story-body">
          <span className="eyebrow light">A LITTLE SPACE. BIG POSSIBILITIES.</span>
          <h1>
            พื้นที่เล็ก ๆ<br />
            สำหรับไอเดีย
            <br />
            <em>ที่ยิ่งใหญ่</em>
          </h1>
          <p>
            ค้นหาอุปกรณ์ จองเวลา แล้วลงมือสร้าง
            <br />
            ให้ทุกการทดลองเริ่มต้นได้ง่ายขึ้น
          </p>
          <div className="orbit">
            <div className="orbit-ring" />
            <div className="orbit-core">
              <FlaskConical size={62} strokeWidth={1} />
            </div>
            <span className="orbit-label">
              <Sparkles size={14} /> Make room for discovery
            </span>
          </div>
        </div>
        <footer>LABRESERVE / ENGINEERING LEARNING PROJECT</footer>
      </section>
      <section className="auth-form-area">
        <div className="auth-form">
          <span className="pill">
            <span className="dot" /> YOUR NEXT EXPERIMENT STARTS HERE
          </span>
          <h2>{register ? 'เริ่มต้นการทดลองของคุณ' : 'ยินดีต้อนรับกลับมา'}</h2>
          <p className="muted">
            {register
              ? 'สร้างบัญชีสมาชิกเพื่อเริ่มจองอุปกรณ์'
              : 'เข้าสู่ระบบเพื่อค้นหาและจองอุปกรณ์ห้องแล็บ'}
          </p>
          <form onSubmit={submit}>
            <label>
              อีเมล
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                maxLength={254}
              />
            </label>
            <label>
              รหัสผ่าน
              <input
                name="password"
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                placeholder="อย่างน้อย 12 ตัวอักษร"
                minLength={12}
                maxLength={128}
                required
              />
            </label>
            <ErrorNotice error={error} />
            <button className="primary wide" disabled={busy}>
              {busy ? 'กำลังดำเนินการ…' : register ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
              <ArrowUpRight size={18} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? 'มีบัญชีแล้ว?' : 'ยังไม่มีบัญชี?'}{' '}
            <button
              onClick={() => {
                setRegister(!register);
                setError(undefined);
              }}
            >
              {register ? 'กลับไปเข้าสู่ระบบ' : 'สร้างบัญชีใหม่'}
            </button>
          </p>
          <div className="learning-note">
            <BookOpen size={20} />
            <p>
              สร้างเพื่อทดลอง ใช้เพื่อเรียนรู้
              <small>
                โปรเจกต์ตัวอย่าง Software Development
                <br />
                บทเรียนและบัญชี demo อยู่ใน README
              </small>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
export function App() {
  const [user, setUser] = useState<User>(),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<unknown>();
  const navigate = useNavigate();
  useEffect(() => {
    api<{ user: User }>('/auth/me')
      .then((r) => setUser(r.user))
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401)) setError(e);
      })
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <Loading />;
  if (!user)
    return (
      <>
        <ErrorNotice error={error} />
        <Auth
          onLogin={(u) => {
            setUser(u);
            setError(undefined);
            navigate('/');
          }}
        />
      </>
    );
  async function logout() {
    try {
      await api('/auth/logout', 'POST', {});
      setUser(undefined);
      navigate('/');
    } catch (e) {
      setError(e);
    }
  }
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <FlaskConical />
          <span>
            lab<span className="brand-light">reserve</span>
            <i />
          </span>
        </Link>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="เมนูหลัก">
          <NavLink to="/" end>
            <Box size={19} />
            สำรวจอุปกรณ์
          </NavLink>
          <NavLink to="/reservations">
            <CalendarDays size={19} />
            การจองของฉัน
          </NavLink>
          {user.role === 'admin' && (
            <>
              <div className="workspace-label admin-label">ADMINISTRATION</div>
              <NavLink to="/admin/equipment">
                <ShieldCheck size={19} />
                จัดการอุปกรณ์
              </NavLink>
              <NavLink to="/admin/reservations">
                <CalendarDays size={19} />
                รายการจองทั้งหมด
              </NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="lab-note">
            <span className="dot" />
            <div>
              พร้อมสำหรับการเรียนรู้<small>LabReserve · Portfolio project</small>
            </div>
          </div>
          <div className="profile">
            <div className="avatar">{user.email[0].toUpperCase()}</div>
            <div>
              <strong>{user.email.split('@')[0]}</strong>
              <small>{user.role === 'admin' ? 'ผู้ดูแลห้องแล็บ' : 'สมาชิกห้องแล็บ'}</small>
            </div>
            <button className="icon-button" onClick={logout} aria-label="ออกจากระบบ">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            WORKSPACE <ChevronRight size={14} /> ห้องปฏิบัติการ
          </span>
          <span className="timezone">เวลาไทย · UTC+7</span>
        </header>
        <main className="content" id="main">
          <ErrorNotice error={error} />
          <Routes>
            <Route path="/" element={<EquipmentList />} />
            <Route path="/equipment/:id" element={<EquipmentDetail />} />
            <Route path="/reservations" element={<ReservationList />} />
            <Route path="/reservations/:id" element={<ReservationDetail user={user} />} />
            {user.role === 'admin' && (
              <>
                <Route path="/admin/equipment" element={<AdminEquipment />} />
                <Route path="/admin/reservations" element={<ReservationList all />} />
              </>
            )}
            <Route
              path="*"
              element={
                <div className="empty">
                  <h1>ไม่พบหน้านี้</h1>
                  <Link to="/">กลับไปสำรวจอุปกรณ์</Link>
                </div>
              }
            />
          </Routes>
        </main>
        <footer className="page-footer">
          BUILT TO EXPLORE. DESIGNED TO LEARN.<span>LabReserve / 01</span>
        </footer>
      </div>
    </div>
  );
}
