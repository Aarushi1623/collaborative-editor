import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import CollabEditor from '../components/CollabEditor.jsx';

export default function EditorPage() {
  const { roomId } = useParams();
  const navigate   = useNavigate();
  const [username, setUsername] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('collab_username')?.trim();
    if (!saved) {
      // Guard: if someone navigates directly to /room/:id without a name, send them back
      navigate('/', { replace: true });
    } else {
      setUsername(saved);
    }
  }, [navigate]);

  if (!username) return null;

  return <CollabEditor roomId={roomId} username={username} />;
}
