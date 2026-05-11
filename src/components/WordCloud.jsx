import { useMemo, useRef, useEffect, useState } from 'react';
import ReactWordcloud from 'react-wordcloud';
import './WordCloud.css';

const DEFAULT_OPTIONS = {
  colors: [
    '#00d4ff', '#a78bfa', '#34d399', '#f59e0b',
    '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6',
    '#10b981', '#f97316', '#3b82f6', '#d946ef'
  ],
  enableTooltip: false,
  deterministic: false,
  fontFamily: '"Segoe UI", system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
  fontSizes: [16, 80],
  fontStyle: 'normal',
  fontWeight: 'bold',
  padding: 3,
  rotations: 2,
  rotationAngles: [-15, 15],
  scale: 'sqrt',
  spiral: 'archimedean',
  transitionDuration: 400
};

function wordCloudCallbacks(setSelectedWord) {
  return {
    onWordClick: (word) => setSelectedWord?.(word),
    getWordColor: (word) => {
      const colors = DEFAULT_OPTIONS.colors;
      return colors[word.text.length % colors.length];
    },
    getWordTooltip: () => undefined
  };
}

function EmptyState() {
  return (
    <div className="wc-empty">
      <div className="wc-empty-icon">☁️</div>
      <p className="wc-empty-text">等待观众提交词汇</p>
      <p className="wc-empty-hint">词云将在收到第一个词汇后自动生成</p>
    </div>
  );
}

function WordCloud({ words = [] }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const options = useMemo(() => {
    const w = dimensions?.width || 800;
    const h = dimensions?.height || 600;
    const minFont = Math.max(12, Math.min(24, w / 40));
    const maxFont = Math.max(40, Math.min(100, w / 10));

    return {
      ...DEFAULT_OPTIONS,
      fontSizes: [minFont, maxFont]
    };
  }, [dimensions]);

  const callbacks = useMemo(() => wordCloudCallbacks(), []);

  if (!words || words.length === 0) {
    return (
      <div className="word-cloud-container" ref={containerRef}>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="word-cloud-container" ref={containerRef}>
      <ReactWordcloud
        words={words}
        options={options}
        callbacks={callbacks}
      />
    </div>
  );
}

export default WordCloud;
