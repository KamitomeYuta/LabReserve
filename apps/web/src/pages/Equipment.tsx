import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  Camera,
  CircuitBoard,
  Cpu,
  Headphones,
  Mic,
  Radio,
  Search,
  Plus,
  Clock3,
} from 'lucide-react';
import type {
  Equipment,
  PageResult,
  Reservation,
} from '../../../../packages/contracts/src/index.js';
import { api } from '../api.js';
import { ErrorNotice, Loading, Pagination, useLoad } from '../components.js';
import { bangkokToIso, displayDate, localDate } from '../dates.js';
const icons = [Camera, Radio, Cpu, Mic, Headphones, CircuitBoard];
function DeviceArt({ code, large = false }: { code: string; large?: boolean }) {
  const prefixes = ['CAM', 'OSC', 'PI', 'MIC', 'VR', 'LOG'];
  const index = Math.max(0, prefixes.indexOf(code.split('-')[0]));
  const Icon = icons[index];
  return (
    <div className={`device-art art-${index} ${large ? 'large' : ''}`}>
      <span className="art-cross">+</span>
      <Icon size={large ? 100 : 64} strokeWidth={1} />
      <span className="art-number">{code}</span>
      <div className="art-grid" />
    </div>
  );
}
export function EquipmentList() {
  const [q, setQ] = useState(''),
    [search, setSearch] = useState(''),
    [page, setPage] = useState(1);
  const state = useLoad(
    () => api<PageResult<Equipment>>(`/equipment?page=${page}&q=${encodeURIComponent(search)}`),
    `${page}:${search}`,
  );
  return (
    <>
      <section className="page-heading">
        <div>
          <span className="eyebrow">EXPLORE THE LAB</span>
          <h1>
            อุปกรณ์สำหรับไอเดียถัดไป<span className="accent">.</span>
          </h1>
          <p className="muted">เลือกเครื่องมือที่ใช่ แล้วให้ความอยากรู้นำทาง</p>
        </div>
        <span className="outline-pill">
          <span className="dot" /> SHARED TOOLS, MORE POSSIBILITIES
        </span>
      </section>
      <section className="intro-banner">
        <div>
          <span className="eyebrow">FROM CURIOSITY TO CREATION</span>
          <h2>
            การทดลองครั้งใหม่
            <br />
            เริ่มต้นที่นี่
          </h2>
          <p>สำรวจอุปกรณ์ ตรวจช่วงเวลา และจองได้ในไม่กี่ขั้นตอน</p>
        </div>
        <div className="banner-mark">
          <Cpu size={90} strokeWidth={0.8} />
          <span>01 / DISCOVER</span>
        </div>
      </section>
      <div className="section-toolbar">
        <h2>
          คลังอุปกรณ์ <span className="count">{state.data?.total ?? '—'}</span>
        </h2>
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(q);
            setPage(1);
          }}
        >
          <Search size={18} />
          <input
            aria-label="ค้นหาอุปกรณ์"
            placeholder="ค้นหาชื่อหรือรหัสอุปกรณ์…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit">ค้นหา</button>
        </form>
      </div>
      <ErrorNotice error={state.error} />
      {state.busy ? (
        <Loading />
      ) : (
        state.data && (
          <>
            <div className="equipment-grid">
              {state.data.items.map((item) => (
                <article className="equipment-card" key={item.id}>
                  <Link to={`/equipment/${item.id}`} aria-label={`ดูรายละเอียด ${item.name}`}>
                    <DeviceArt code={item.assetCode} />
                    <div className="card-content">
                      <div className="card-meta">
                        <span>{item.assetCode}</span>
                        <span className={`badge ${item.active ? 'available' : 'inactive'}`}>
                          {item.active ? 'เปิดรับจอง' : 'ปิดรับจอง'}
                        </span>
                      </div>
                      <h3>{item.name}</h3>
                      <p>{item.description}</p>
                      <div className="card-bottom">
                        <span>ดูรายละเอียดและช่วงเวลา</span>
                        <ArrowUpRight size={19} />
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
            {state.data.items.length === 0 && (
              <div className="empty">ไม่พบอุปกรณ์ ลองใช้คำค้นอื่น</div>
            )}
            <Pagination {...state.data} onChange={setPage} />
          </>
        )
      )}
    </>
  );
}
export function EquipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const state = useLoad(() => api<{ item: Equipment }>(`/equipment/${id}`), id!);
  const [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false),
    [slots, setSlots] = useState<{ startAt: string; endAt: string }[]>(),
    [checked, setChecked] = useState(false);
  const [start, setStart] = useState(localDate(new Date(Date.now() + 86400000))),
    [end, setEnd] = useState(localDate(new Date(Date.now() + 90000000)));
  const interval = () => ({ startAt: bangkokToIso(start), endAt: bangkokToIso(end) });
  async function check() {
    setError(undefined);
    setBusy(true);
    try {
      const result = await api<{ items: { startAt: string; endAt: string }[] }>(
        `/equipment/${id}/availability?${new URLSearchParams(interval())}`,
      );
      setSlots(result.items);
      setChecked(true);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function book(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setBusy(true);
    try {
      const r = await api<{ item: Reservation }>('/reservations', 'POST', {
        equipmentId: id,
        ...interval(),
      });
      navigate(`/reservations/${r.item.id}`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  if (state.busy) return <Loading />;
  if (!state.data) return <ErrorNotice error={state.error} />;
  const item = state.data.item;
  return (
    <>
      <Link to="/" className="back-link">
        <ArrowLeft size={16} /> กลับไปคลังอุปกรณ์
      </Link>
      <div className="detail-grid">
        <section>
          <DeviceArt code={item.assetCode} large />
          <div className="detail-description">
            <span className="eyebrow">{item.assetCode}</span>
            <h1>{item.name}</h1>
            <p>{item.description}</p>
            <div className="notice">
              <Clock3 size={18} /> การจองใช้เวลาไทย (Asia/Bangkok)
              และยืนยันอัตโนมัติเมื่อช่วงเวลาว่าง
            </div>
          </div>
        </section>
        <section className="panel booking-panel">
          <span className="eyebrow">MAKE IT HAPPEN</span>
          <h2>จองเวลาสำหรับไอเดียของคุณ</h2>
          <p className="muted">
            เลือกเวลาเริ่มและสิ้นสุด ระบบจะตรวจการจองซ้ำให้อีกครั้งเมื่อยืนยัน
          </p>
          <form onSubmit={book}>
            <label>
              เวลาเริ่ม
              <input
                type="datetime-local"
                required
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  setChecked(false);
                }}
              />
            </label>
            <label>
              เวลาสิ้นสุด
              <input
                type="datetime-local"
                required
                value={end}
                onChange={(e) => {
                  setEnd(e.target.value);
                  setChecked(false);
                }}
              />
            </label>
            <button type="button" className="secondary wide" disabled={busy} onClick={check}>
              ตรวจสอบช่วงเวลา
            </button>
            {checked && (
              <div className="notice" role="status">
                {slots?.length
                  ? `มี ${slots.length} ช่วงเวลาที่จองแล้ว`
                  : 'ยังไม่มีรายการจองซ้อนในช่วงนี้'}
              </div>
            )}
            {checked &&
              slots?.map((s) => (
                <p className="slot" key={s.startAt}>
                  {displayDate(s.startAt)}
                  <br />
                  ถึง {displayDate(s.endAt)}
                </p>
              ))}
            <ErrorNotice error={error} />
            <button className="primary wide" disabled={busy || !item.active}>
              {busy ? 'กำลังดำเนินการ…' : item.active ? 'ยืนยันการจอง' : 'อุปกรณ์ปิดรับจอง'}
              <ArrowUpRight size={18} />
            </button>
          </form>
          <small className="muted">สมาชิกยกเลิกได้ก่อนเวลาเริ่มจอง</small>
        </section>
      </div>
    </>
  );
}
export function AdminEquipment() {
  const [page, setPage] = useState(1),
    [error, setError] = useState<unknown>(),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<Equipment>();
  const state = useLoad(() => api<PageResult<Equipment>>(`/equipment?page=${page}`), String(page));
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      d = new FormData(form);
    setBusy(true);
    setError(undefined);
    setMessage('');
    try {
      await api(editing ? `/equipment/${editing.id}` : '/equipment', editing ? 'PATCH' : 'POST', {
        assetCode: d.get('assetCode'),
        name: d.get('name'),
        description: d.get('description'),
      });
      setMessage(editing ? 'บันทึกการแก้ไขแล้ว' : 'เพิ่มอุปกรณ์แล้ว');
      setEditing(undefined);
      form.reset();
      state.reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  async function toggle(item: Equipment) {
    setBusy(true);
    setError(undefined);
    try {
      await api(`/equipment/${item.id}`, 'PATCH', { active: !item.active });
      state.reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">LAB ADMINISTRATION</span>
          <h1>
            จัดการอุปกรณ์<span className="accent">.</span>
          </h1>
          <p className="muted">ปิดรับจองได้โดยเก็บประวัติเดิมไว้</p>
        </div>
      </div>
      <div className="admin-grid">
        <section>
          <ErrorNotice error={state.error} />
          {state.busy ? (
            <Loading />
          ) : (
            state.data && (
              <>
                <div className="admin-list">
                  {state.data.items.map((item) => (
                    <article className="panel admin-item" key={item.id}>
                      <div>
                        <span className="eyebrow">{item.assetCode}</span>
                        <h3>{item.name}</h3>
                        <span className={`badge ${item.active ? 'available' : 'inactive'}`}>
                          {item.active ? 'เปิดรับจอง' : 'ปิดรับจอง'}
                        </span>
                      </div>
                      <div className="button-row">
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() => setEditing(item)}
                        >
                          แก้ไข
                        </button>
                        <button className="secondary" disabled={busy} onClick={() => toggle(item)}>
                          {item.active ? 'ปิดรับจอง' : 'เปิดรับจอง'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                <Pagination {...state.data} onChange={setPage} />
              </>
            )
          )}
        </section>
        <section className="panel">
          <h2>
            <Plus size={20} /> {editing ? 'แก้ไขอุปกรณ์' : 'เพิ่มอุปกรณ์'}
          </h2>
          <form onSubmit={save} key={editing?.id ?? 'new'}>
            <label>
              รหัสอุปกรณ์
              <input
                name="assetCode"
                defaultValue={editing?.assetCode}
                required
                maxLength={40}
                pattern="[A-Za-z0-9_\-]+"
                placeholder="เช่น CAM-002"
              />
            </label>
            <label>
              ชื่ออุปกรณ์
              <input name="name" defaultValue={editing?.name} required maxLength={120} />
            </label>
            <label>
              รายละเอียด
              <textarea name="description" defaultValue={editing?.description} maxLength={1000} />
            </label>
            <ErrorNotice error={error} />
            {message && (
              <div role="status" className="notice success">
                {message}
              </div>
            )}
            <button className="primary wide" disabled={busy}>
              {editing ? 'บันทึกการแก้ไข' : 'เพิ่มอุปกรณ์'}
            </button>
            {editing && (
              <button
                type="button"
                className="secondary wide"
                onClick={() => setEditing(undefined)}
              >
                ยกเลิกการแก้ไข
              </button>
            )}
          </form>
        </section>
      </div>
    </>
  );
}
