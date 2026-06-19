import { useEffect, useRef } from 'react';

export default function ConsolePanel({ output, isRunning }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output, isRunning]);

  if (isRunning) {
    return (
      <div className="console">
        <div className="console__running">
          <span className="console__spinner" />
          Running…
        </div>
        <div ref={bottomRef} />
      </div>
    );
  }

  if (!output) {
    return (
      <div className="console">
        <p className="console__empty">Press Run to execute your code.</p>
      </div>
    );
  }

  const { stdout, stderr, exitCode } = output;
  const hasOutput = stdout || stderr;

  return (
    <div className="console">
      {stderr  && <pre className="console__block console__stderr">{stderr}</pre>}
      {stdout  && <pre className="console__block console__stdout">{stdout}</pre>}

      {!hasOutput && (
        <pre className="console__block console__stdout">(no output)</pre>
      )}

      <div className={`console__footer ${exitCode === 0 ? 'console__exit-ok' : 'console__exit-err'}`}>
        {exitCode === 0 ? '✓' : '✗'}
        <span>Process exited with code {exitCode}</span>
      </div>

      <div ref={bottomRef} />
    </div>
  );
}
