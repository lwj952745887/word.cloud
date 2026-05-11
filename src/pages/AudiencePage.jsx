import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket';
import './AudiencePage.css';

function AudiencePage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [word, setWord] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!roomId) {
      navigate('/', { replace: true });
      return;
    }

    const onConnect = () => {
      setConnectionStatus('connected');
      socket.emit('join-room', { roomId }, (res) => {
        if (res && res.error) {
          setError(res.error);
        } else {
          setJoined(true);
        }
      });
    };

    const onDisconnect = () => {
      setConnectionStatus('disconnected');
    };

    const handleRoomData = (data) => {
      setTopic(data.topic || '');
      setJoined(true);
    };

    const handleTopicUpdate = (newTopic) => {
      setTopic(newTopic);
    };

    if (socket.connected) {
      onConnect();
    } else {
      socket.on('connect', onConnect);
    }

    socket.on('disconnect', onDisconnect);
    socket.on('room-data', handleRoomData);
    socket.on('topic-update', handleTopicUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room-data', handleRoomData);
      socket.off('topic-update', handleTopicUpdate);
    };
  }, [roomId, navigate]);

  const submitWord = () => {
    const trimmed = word.trim();
    if (!trimmed) return;
    socket.emit('submit-word', { roomId, word: trimmed });
    setSubmitted(true);
    setWord('');
    setTimeout(() => {
      setSubmitted(false);
      inputRef.current?.focus();
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitWord();
    }
  };

  if (!roomId) return null;

  return (
    <div className="audience-page page-center">
      <div className="audience-content slide-up">
        {connectionStatus === 'disconnected' ? (
          <div className="glass-card status-card error-card">
            <div className="status-icon">!</div>
            <h2>连接断开</h2>
            <p>与服务器的连接已断开，请检查网络后刷新页面重试。</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              刷新重试
            </button>
          </div>
        ) : error ? (
          <div className="glass-card status-card error-card">
            <div className="status-icon">!</div>
            <h2>加入失败</h2>
            <p>{error}</p>
            <button className="btn btn-secondary" onClick={() => navigate('/')}>
              返回首页
            </button>
          </div>
        ) : (
          <>
            <div className="audience-header">
              <span className="audience-room-tag">房间 {roomId}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/')}>
                退出
              </button>
            </div>

            {topic && (
              <div className="glass-card topic-card">
                <div className="topic-label">当前话题</div>
                <div className="topic-text">{topic}</div>
              </div>
            )}

            <div className="glass-card input-card">
              {submitted ? (
                <div className="submit-success">
                  <div className="success-icon">✓</div>
                  <p>已提交！继续输入更多想法吧</p>
                </div>
              ) : (
                <>
                  <label className="input-label" htmlFor="word-input">
                    {topic ? '输入你的想法' : '输入关键词'}
                  </label>
                  <div className="input-wrapper">
                    <input
                      id="word-input"
                      ref={inputRef}
                      className="input-field audience-input"
                      type="text"
                      placeholder="例如：创新、协作、..."
                      value={word}
                      onChange={(e) => setWord(e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      autoComplete="off"
                    />
                  </div>
                  <button
                    className="btn btn-primary btn-lg submit-btn"
                    onClick={submitWord}
                    disabled={!word.trim()}
                  >
                    提交
                  </button>
                  <p className="input-hint">输入后按 Enter 键快速提交</p>
                </>
              )}
            </div>

            {!joined && (
              <div className="connecting-indicator">
                <span className="connecting-dot"></span>
                正在连接房间...
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AudiencePage;
