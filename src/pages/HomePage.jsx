import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';
import './HomePage.css';

function HomePage() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(socket.connected);
  const [connFailed, setConnFailed] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      setConnFailed(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    const onDisconnect = () => setConnected(false);
    const onConnError = () => setConnFailed(true);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnError);

    // Show timeout message after 15 seconds of no connection
    if (!socket.connected) {
      timeoutRef.current = setTimeout(() => {
        setConnFailed(true);
        setError('⚠ 无法连接到服务器。请确认后端服务已部署并运行。');
      }, 15000);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnError);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const reconnect = () => {
    setError('');
    setConnFailed(false);
    socket.connect();
    timeoutRef.current = setTimeout(() => {
      setConnFailed(true);
      setError('⚠ 无法连接到服务器。请确认后端服务已部署并运行。');
    }, 15000);
  };

  const createRoom = () => {
    if (!socket.connected) {
      setError('正在连接服务器，请稍候...');
      return;
    }
    setLoading(true);
    setError('');
    const timeout = setTimeout(() => {
      setLoading(false);
      setError('请求超时，服务器无响应。请稍后重试。');
    }, 10000);
    socket.emit('create-room', ({ roomId }) => {
      clearTimeout(timeout);
      setLoading(false);
      navigate(`/host`, { state: { roomId } });
    });
  };

  const joinRoom = () => {
    const id = roomId.trim().toUpperCase();
    if (!id) {
      setError('请输入房间号');
      return;
    }
    if (!socket.connected) {
      setError('正在连接服务器，请稍候...');
      return;
    }
    setLoading(true);
    setError('');
    const timeout = setTimeout(() => {
      setLoading(false);
      setError('请求超时，服务器无响应。请稍后重试。');
    }, 10000);
    socket.emit('join-room', { roomId: id }, (res) => {
      clearTimeout(timeout);
      setLoading(false);
      if (res && res.error) {
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

        <div className={`status-bar ${connected ? 'status-connected' : connFailed ? 'status-error' : 'status-connecting'}`}>
          <span className="status-dot"></span>
          <span>
            {connected ? '已连接服务器' : connFailed ? '连接失败' : '正在连接服务器...'}
          </span>
          {connFailed && (
            <button className="btn-reconnect" onClick={reconnect}>
              重新连接
            </button>
          )}
        </div>

        <div className="home-cards">
          <div className={`home-card glass-card ${loading ? 'card-disabled' : ''}`} onClick={createRoom}>
            <div className="card-icon">+</div>
            <h3>{loading ? '连接中...' : '创建房间'}</h3>
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
            <button className={`btn btn-primary ${loading ? 'btn-loading' : ''}`} onClick={joinRoom} disabled={loading}>
              {loading ? '连接中...' : '加入'}
            </button>
          </div>
          {error && <p className="join-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
