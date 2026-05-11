import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';
import './HomePage.css';

function HomePage() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');

  const createRoom = () => {
    socket.emit('create-room', ({ roomId }) => {
      navigate(`/host`, { state: { roomId } });
    });
  };

  const joinRoom = () => {
    const id = roomId.trim().toUpperCase();
    if (!id) {
      setError('请输入房间号');
      return;
    }
    socket.emit('join-room', { roomId: id }, (res) => {
      if (res.error) {
        setError(res.error);
      } else {
        navigate(`/audience/${id}`);
      }
    });
  };

  const viewDisplay = () => {
    const id = roomId.trim().toUpperCase();
    if (!id) {
      setError('请输入房间号');
      return;
    }
    navigate(`/display/${id}`);
  };

  return (
    <div className="home-page page-center">
      <div className="home-content slide-up">
        <div className="home-logo">
          <div className="logo-icon">W</div>
        </div>
        <h1 className="home-title">Word Cloud</h1>
        <p className="home-desc">实时互动词云工具 — 让每一个声音都被看见</p>

        <div className="home-cards">
          <div className="home-card glass-card" onClick={createRoom}>
            <div className="card-icon">+</div>
            <h3>创建房间</h3>
            <p>作为主持人发起一个话题，开始收集观众的反馈</p>
          </div>

          <div className="home-card glass-card" onClick={() => document.querySelector('.join-section').scrollIntoView({ behavior: 'smooth' })}>
            <div className="card-icon">→</div>
            <h3>加入房间</h3>
            <p>作为观众输入房间号，提交你的关键词</p>
          </div>

          <div className="home-card glass-card" onClick={() => roomId && viewDisplay()}>
            <div className="card-icon">◉</div>
            <h3>展示大屏</h3>
            <p>在大屏幕上展示词云，进入展示模式</p>
          </div>
        </div>

        <div className="join-section glass-card">
          <h3>加入已有房间</h3>
          <div className="join-input-row">
            <input
              className="input-field join-input"
              type="text"
              placeholder="输入房间号 (如: A1B2C3)"
              value={roomId}
              onChange={(e) => { setRoomId(e.target.value.toUpperCase()); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
              maxLength={6}
            />
            <button className="btn btn-primary" onClick={joinRoom}>加入</button>
          </div>
          {error && <p className="join-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
