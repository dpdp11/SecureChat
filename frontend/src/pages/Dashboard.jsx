import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Dashboard() {
  const [friends, setFriends] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ friendId: null, step: 0 });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
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
          fetchFriends(); // Refresh active chat list positioning
        }
      };
      socket.on('receive_message', handleIncoming);
      return () => socket.off('receive_message', handleIncoming);
    }
  }, [socket, user]);

  const fetchFriends = async () => {
    try {
      const res = await fetch(`https://securechat-u1nk.onrender.com/api/users/friends/${user.id}`);
      const data = await res.json();
      setFriends(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching friends', err);
    }
  };

  const fetchUnreadCounts = async () => {
    try {
      const res = await fetch(`https://securechat-u1nk.onrender.com/api/messages/unread/${user.id}`);
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
      const res = await fetch(`https://securechat-u1nk.onrender.com/api/users/search?q=${searchQuery}`);
      const data = await res.json();
      setSearchResults(data.filter(u => u._id !== user.id)); 
    } catch (err) {
      console.error('Error searching users', err);
    }
  };

  const addFriend = async (friendId) => {
    try {
      await fetch('https://securechat-u1nk.onrender.com/api/users/add-friend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, friendId })
      });
      setSearchQuery('');
      setSearchResults([]);
      setHasSearched(false);
      fetchFriends();
      setIsSidebarOpen(false); // Close sidebar after adding
    } catch (err) {
      console.error('Error adding friend', err);
    }
  };

  const handleDeleteChat = async (e, friendId) => {
    e.stopPropagation(); 
    if (deleteConfirm.friendId !== friendId) {
      setDeleteConfirm({ friendId, step: 1 });
      return;
    }
    if (deleteConfirm.step === 1) {
      setDeleteConfirm({ friendId, step: 2 });
      return;
    }
    if (deleteConfirm.step === 2) {
      try {
        await fetch(`https://securechat-u1nk.onrender.com/api/messages/history/${user.id}/${friendId}`, {
          method: 'DELETE'
        });
        setDeleteConfirm({ friendId: null, step: 0 });
        fetchFriends(); // This will drop it from "Active Chats" automatically
        fetchUnreadCounts();
      } catch (err) {
        console.error('Error deleting chat', err);
      }
    }
  };

  const getDeleteText = (fId) => {
    if (deleteConfirm.friendId !== fId) return '🗑️';
    if (deleteConfirm.step === 1) return 'Delete?';
    if (deleteConfirm.step === 2) return 'Sure?';
  };

  const getDeleteStyle = (fId) => {
    if (deleteConfirm.friendId !== fId) return { background: 'transparent', color: 'var(--text-secondary)' };
    if (deleteConfirm.step === 1) return { background: 'var(--danger)', color: 'white' };
    if (deleteConfirm.step === 2) return { background: 'red', color: 'white', fontWeight: 'bold' };
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const activeChats = friends.filter(f => f.hasActiveChat);

  return (
    <div className="dashboard-container" style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '2rem', width: '100%', minHeight: '100vh', padding: '1rem', boxSizing: 'border-box' }} onClick={() => setDeleteConfirm({ friendId: null, step: 0 })}>
      
      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '700px', margin: '0 auto 2rem auto' }}>
        <h1 style={{ 
          margin: 0,
          background: 'linear-gradient(to right, #58a6ff, #a371f7)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontSize: '1.75rem'
        }}>
          SecureChat
        </h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="btn" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }} onClick={() => setIsSidebarOpen(true)}>
            Friends / Add &rarr;
          </button>
          <button className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }} onClick={handleLogout}>Logout</button>
        </div>
      </div>
      
      {/* Main Single Pane - Active Chats Only */}
      <div className="glass-panel dashboard-box" style={{ width: '100%', maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '1rem', margin: '0 auto' }} onClick={(e) => e.stopPropagation()}>
        
        <h2 className="auth-title" style={{ textAlign: 'left', marginBottom: '0.5rem', fontSize: '1.25rem', background: 'none', WebkitTextFillColor: 'var(--text-primary)' }}>Your Chats</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {activeChats.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '1rem 0' }}>No active chats. Open the Friends menu to start one!</p>
          ) : (
            activeChats.map(f => {
              const isOnline = onlineUsers.includes(f._id);
              const unread = unreadCounts[f._id] || 0;
              return (
                <div 
                  key={f._id} 
                  style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
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
                      <span style={{ background: 'var(--danger)', color: 'white', border: '1px solid transparent', borderRadius: '12px', padding: '0.1rem 0.5rem', fontSize: '0.7rem', fontWeight: 'bold' }}>
                        {unread}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button 
                      className="btn"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer', ...getDeleteStyle(f._id) }}
                      onClick={(e) => handleDeleteChat(e, f._id)}
                    >
                      {getDeleteText(f._id)}
                    </button>
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent)', marginLeft: '4px' }}>&rarr;</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Hamburger Modal Sidebar */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}>
          <div className="sidebar-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Friends</h2>
              <button 
                onClick={() => setIsSidebarOpen(false)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '2rem', cursor: 'pointer', lineHeight: '1rem', padding: 0 }}
              >&times;</button>
            </div>

            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Find Users</h3>
            <form onSubmit={searchUsers} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ marginBottom: 0, flex: 1 }}
              />
              <button type="submit" className="btn" style={{ padding: '0.5rem 1rem' }}>Search</button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
              {hasSearched && searchResults.length === 0 && (
                 <div style={{ padding: '0.75rem', color: 'var(--danger)', textAlign: 'center', background: 'rgba(255,0,0,0.1)', borderRadius: '8px', fontSize: '0.9rem' }}>
                   User not found.
                 </div>
              )}
              {searchResults.map(u => (
                <div key={u._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.95rem' }}>{u.username}</span>
                  {friends.some(f => f._id === u._id) ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>Added</span>
                  ) : (
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
                      onClick={() => addFriend(u._id)}
                    >
                      Add
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <hr style={{ border: 'none', borderBottom: '1px solid var(--glass-border)', marginBottom: '1.5rem' }} />

            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>All Connected Friends</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
               {friends.length === 0 ? (
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No friends yet. Add some above!</span>
               ) : (
                 friends.map(f => {
                    const isOnline = onlineUsers.includes(f._id);
                    return (
                      <div 
                        key={f._id} 
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', cursor: 'pointer' }} 
                        onClick={() => navigate(`/chat/${f._id}`)}
                      >
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ 
                               width: '8px', height: '8px', borderRadius: '50%', 
                               background: isOnline ? 'var(--success)' : 'var(--text-secondary)',
                            }}></div>
                            <span style={{ fontSize: '0.95rem' }}>{f.username}</span>
                         </div>
                         <span style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>Chat</span>
                      </div>
                    )
                 })
               )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;
