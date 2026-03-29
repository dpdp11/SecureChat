import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Dashboard() {
  const [friends, setFriends] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const navigate = useNavigate();
  const { user, logout, socket, onlineUsers } = useContext(AuthContext);

  useEffect(() => {
    if (user) {
      if (!user.id) {
        logout();
        navigate('/login');
        return;
      }
      fetchFriends();
      fetchUnreadCounts();
    }
  }, [user]);

  useEffect(() => {
    if (socket) {
      const handleIncoming = (data) => {
        if (data.receiver._id === user.id) {
          fetchUnreadCounts(); 
        }
      };
      socket.on('receive_message', handleIncoming);
      return () => socket.off('receive_message', handleIncoming);
    }
  }, [socket, user]);

  const fetchFriends = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/users/friends/${user.id}`);
      const data = await res.json();
      setFriends(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching friends', err);
    }
  };

  const fetchUnreadCounts = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/messages/unread/${user.id}`);
      const data = await res.json();
      setUnreadCounts(data || {});
    } catch (err) {
      console.error('Error fetching unread counts', err);
    }
  };

  const searchUsers = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      setHasSearched(true);
      const res = await fetch(`http://localhost:3000/api/users/search?q=${searchQuery}`);
      const data = await res.json();
      setSearchResults(data.filter(u => u._id !== user.id)); 
    } catch (err) {
      console.error('Error searching users', err);
    }
  };

  const addFriend = async (friendId) => {
    try {
      await fetch('http://localhost:3000/api/users/add-friend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, friendId })
      });
      setSearchQuery('');
      setSearchResults([]);
      setHasSearched(false);
      fetchFriends();
    } catch (err) {
      console.error('Error adding friend', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-container" style={{ alignItems: 'flex-start', paddingTop: '4rem' }}>
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
      </div>
      
      <div className="glass-panel dashboard-box" style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'row', gap: '2rem' }}>
        
        {/* Friends List Pane */}
        <div style={{ flex: 1 }}>
          <h2 className="auth-title" style={{ textAlign: 'left', marginBottom: '1rem', fontSize: '1.5rem' }}>Your Chats</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {friends.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No friends added yet. Search on the right!</p>
            ) : (
              friends.map(f => {
                const isOnline = onlineUsers.includes(f._id);
                const unread = unreadCounts[f._id] || 0;
                return (
                  <div 
                    key={f._id} 
                    style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => navigate(`/chat/${f._id}`)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ 
                        width: '10px', height: '10px', borderRadius: '50%', 
                        background: isOnline ? 'var(--success)' : 'var(--text-secondary)',
                        boxShadow: isOnline ? '0 0 5px var(--success)' : 'none'
                      }}></div>
                      <span style={{ fontWeight: '500' }}>{f.username}</span>
                      {unread > 0 && (
                        <span style={{ background: 'var(--danger)', color: 'white', border: '1px solid transparent', borderRadius: '12px', padding: '0.1rem 0.5rem', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          {unread}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>Chat &rarr;</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Search & Add Friends Pane */}
        <div style={{ flex: 1, borderLeft: '1px solid var(--glass-border)', paddingLeft: '2rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Find Friends</h3>
          <form onSubmit={searchUsers} style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search username"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: 0, flex: 1 }}
            />
            <button type="submit" className="btn">Search</button>
          </form>

          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {hasSearched && searchResults.length === 0 && (
               <div style={{ padding: '0.75rem', color: 'var(--danger)', textAlign: 'center', background: 'rgba(255,0,0,0.1)', borderRadius: '8px' }}>
                 User not found.
               </div>
            )}
            {searchResults.map(u => (
              <div key={u._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                <span>{u.username}</span>
                {friends.some(f => f._id === u._id) ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>Added</span>
                ) : (
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    onClick={() => addFriend(u._id)}
                  >
                    Add
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;
