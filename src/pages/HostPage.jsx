import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import socket from '../socket';
import './HostPage.css';

function HostPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const roomId = location.state?.roomId;
  const [topic, setTopic] = useState('');
  const [words, setWords] = useState({});
  const [wordCount, setWordCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const sortTimerRef = useRef(null);

  useEffect(() => {
    if (!roomId) {
      navigate('/', { replace: true });
      return;
    }

    socket.emit('join-room', { roomId });

    const handleWordUpdate = (data) => {
      setWords(data);
      setWordCount(Object.values(data).reduce((a, b) => a + b, 0));
    };

    const handleRoomData = (data) => {
      setTopic(data.topic || '');
      if (data.words) {
        setWords(data.words);
        setWordCount(data.wordCount || 0);
      }
    };

    socket.on('word-update', handleWordUpdate);
    socket.on('room-data', handleRoomData);

    return () => {
      socket.off('word-update', handleWordUpdate);
      socket.off('room-data', handleRoomData);
    };
  }, [roomId, navigate]);

  const setTopicHandler = useCallback(() => {
    socket.emit('set-topic', { roomId, topic });
  }, [roomId, topic]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setTopicHandler();
    }
  };

  const clearWords = () => {
    socket.emit('clear-words', { roomId });
  };

  const copyRoomId = () => {
    const shareUrl = `${window.location.origin}/audience/${roomId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const openDisplay = () => {
    window.open(`/display/${roomId}`, '_blank');
  };

  // Sort words by frequency (descending) with debounce
  const [sortKey, setSortKey] = useState(0);
  useEffect(() => {
    clearTimeout(sortTimerRef.current);
    sortTimerRef.current = setTimeout(() => setSortKey((k) => k + 1), 200);
  }, [words]);

  const sortedWords = Object.entries(words)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 100);

  if (!roomId) return null;

  return (
    <div className="host-page page-container">
      <div className="host-header fade-in">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/')}>
          ← 返回首页
        </button>
        <h1 className="page-title">主持人面板</h1>
      </div>

      <div className="host-grid">
        {/* Left Column: Room Info & Controls */}
        <div className="host-left">
          {/* Room ID */}
          <div className="glass-card host-section">
            <h3>房间号</h3>
            <div className="room-info-row">
              <div className="room-badge">{roomId}</div>
              <button className="btn-copy" onClick={copyRoomId}>
                {copied ? '已复制' : '复制链接'}
              </button>
            </div>
            <p className="room-hint">
              分享链接给观众即可参与互动
            </p>
          </div>

          {/* Topic */}
          <div className="glass-card host-section">
            <h3>设置话题</h3>
            <div className="topic-input-row">
              <input
                className="input-field"
                placeholder="输入你想讨论的话题..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button className="btn btn-primary btn-sm" onClick={setTopicHandler}>
                发布
              </button>
            </div>
            {topic && (
              <div className="current-topic">
                当前话题：<span>{topic}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="glass-card host-section">
            <h3>操作</h3>
            <div className="host-actions">
              <button className="btn btn-primary" onClick={openDisplay}>
                打开词云展示
              </button>
              <button className="btn btn-danger btn-sm" onClick={clearWords}>
                清空所有词
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="glass-card host-section">
            <h3>统计数据</h3>
            <div className="stats-row">
              <div className="stat-item">
                <span className="stat-number">{Object.keys(words).length}</span>
                <span className="stat-label">不同词汇</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{wordCount}</span>
                <span className="stat-label">总提交数</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Word List */}
        <div className="host-right">
          <div className="glass-card host-section word-list-section">
            <h3>词汇列表 <span className="word-count-badge">{sortedWords.length}</span></h3>
            <div className="word-list">
              {sortedWords.length === 0 ? (
                <p className="empty-hint">还没有词汇，等待观众提交...</p>
              ) : (
                sortedWords.map(([word, count]) => (
                  <div key={word} className="word-item">
                    <span className="word-item-text">{word}</span>
                    <span className="word-item-bar-container">
                      <span
                        className="word-item-bar"
                        style={{ width: `${Math.min((count / sortedWords[0][1]) * 100, 100)}%` }}
                      />
                    </span>
                    <span className="word-item-count">{count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HostPage;
