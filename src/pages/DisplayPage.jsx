import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket';
import WordCloud from '../components/WordCloud';
import './DisplayPage.css';

function DisplayPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [words, setWords] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!roomId) {
      navigate('/', { replace: true });
      return;
    }

    const onConnect = () => {
      socket.emit('join-room', { roomId }, (res) => {
        if (res && res.error) {
          setError(res.error);
        }
      });
    };

    const handleRoomData = (data) => {
      setTopic(data.topic || '');
      if (data.words) {
        setWords(data.words);
      }
    };

    const handleWordUpdate = (data) => {
      setWords(data);
    };

    const handleTopicUpdate = (newTopic) => {
      setTopic(newTopic);
    };

    if (socket.connected) {
      onConnect();
    } else {
      socket.on('connect', onConnect);
    }

    socket.on('room-data', handleRoomData);
    socket.on('word-update', handleWordUpdate);
    socket.on('topic-update', handleTopicUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('room-data', handleRoomData);
      socket.off('word-update', handleWordUpdate);
      socket.off('topic-update', handleTopicUpdate);
    };
  }, [roomId, navigate]);

  if (!roomId) return null;

  if (error) {
    return (
      <div className="display-page page-center">
        <div className="glass-card status-card error-card">
          <div className="status-icon">!</div>
          <h2>房间不存在</h2>
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const wordData = Object.entries(words).map(([text, value]) => ({
    text,
    value: Math.max(value, 1)
  }));

  return (
    <div className="display-page">
      {/* Topic overlay */}
      <div className="display-header">
        <div className="display-info">
          <span className="display-room">房间 {roomId}</span>
          {topic && <span className="display-topic">{topic}</span>}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/')}>
          退出
        </button>
      </div>

      {/* Word count badge */}
      <div className="display-stats">
        <span className="display-word-count">
          {Object.keys(words).length} 个词汇 · {Object.values(words).reduce((a, b) => a + b, 0)} 次提交
        </span>
      </div>

      {/* Word Cloud */}
      <div className="display-cloud">
        <WordCloud words={wordData} />
      </div>

      {/* Ambient decoration */}
      <div className="display-ambient-left" />
      <div className="display-ambient-right" />
    </div>
  );
}

export default DisplayPage;
