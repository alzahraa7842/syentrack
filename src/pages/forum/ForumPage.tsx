import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Heart, 
  MessageCircle, 
  Lock, 
  Unlock, 
  Trash2, 
  Send, 
  Share2, 
  Sparkles,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { StorageService } from '../../services/storageService';
import { ForumPost } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useNotification } from '../../contexts/NotificationContext';

export const ForumPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [posts, setPosts] = useState<ForumPost[]>(StorageService.getForumPosts());
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // New Post Modal
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<'Karier' | 'Kuliah' | 'Networking' | 'Lowongan' | 'Umum'>('Karier');

  // Comment input state per post
  const [activeCommentPostId, setActiveCommentPostId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');

  const reloadPosts = () => {
    setPosts(StorageService.getForumPosts());
  };

  useEffect(() => {
    window.addEventListener('alumnitrack_data_changed', reloadPosts);
    return () => window.removeEventListener('alumnitrack_data_changed', reloadPosts);
  }, []);

  const filteredPosts = posts.filter(p => {
    return selectedCategory === 'ALL' || p.category === selectedCategory;
  });

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      showToast('error', 'Judul dan konten postingan tidak boleh kosong');
      return;
    }

    StorageService.saveForumPost({
      author_id: user?.id || 1,
      author_name: user?.name || 'Alumni User',
      author_role: user?.role || 'ALUMNI',
      author_avatar: user?.avatar,
      title: newTitle,
      content: newContent,
      category: newCategory
    });

    StorageService.addAuditLog(user?.name || 'User', user?.role || 'ALUMNI', `Membuat postingan forum: ${newTitle}`);
    showToast('success', 'Postingan diskusi Anda berhasil diterbitkan!');
    setNewTitle('');
    setNewContent('');
    setIsNewPostModalOpen(false);
    reloadPosts();
  };

  const handleToggleLike = (postId: number) => {
    StorageService.toggleLikePost(postId);
    reloadPosts();
  };

  const handleAddComment = (postId: number) => {
    if (!commentText.trim()) return;

    StorageService.addComment(postId, {
      author_id: user?.id || 1,
      author_name: user?.name || 'Alumni User',
      author_role: user?.role || 'ALUMNI',
      author_avatar: user?.avatar,
      content: commentText.trim()
    });

    showToast('success', 'Komentar berhasil dikirim');
    setCommentText('');
    reloadPosts();
  };

  const handleToggleLock = (postId: number) => {
    StorageService.toggleLockPost(postId);
    showToast('info', 'Status kunci diskusi diperbarui');
    reloadPosts();
  };

  const handleDeletePost = (postId: number) => {
    StorageService.deletePost(postId);
    StorageService.addAuditLog(user?.name || 'Admin', user?.role || 'ADMIN', `Menghapus postingan forum #${postId}`);
    showToast('info', 'Postingan telah dihapus');
    reloadPosts();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Forum Diskusi & Jejaring Alumni
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Wadah diskusi terbuka, berbagi pengalaman dunia kerja, info kampus, dan kolaborasi profesional
          </p>
        </div>

        <button
          onClick={() => setIsNewPostModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Diskusi Baru</span>
        </button>
      </div>

      {/* Category Pills Bar */}
      <div className="flex flex-wrap items-center gap-1 bg-white p-2 rounded-2xl border border-slate-200/90 shadow-xs text-xs font-medium">
        {['ALL', 'Karier', 'Kuliah', 'Networking', 'Lowongan', 'Umum'].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              selectedCategory === cat
                ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {cat === 'ALL' ? 'Semua Topik' : cat}
          </button>
        ))}
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {filteredPosts.map(post => {
          const isAuthor = user?.id === post.author_id;
          const isAdmin = user?.role === 'ADMIN';

          return (
            <div
              key={post.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4 hover:border-slate-300 transition-all"
            >
              {/* Author & Header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={post.author_avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"}
                    alt={post.author_name}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{post.author_name}</span>
                      <Badge variant={post.author_role === 'ADMIN' ? 'primary' : 'neutral'}>
                        {post.author_role === 'ADMIN' ? 'Guru BK' : 'Alumni'}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-400 tabular-nums">{post.created_at}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="info">{post.category}</Badge>
                  {post.is_locked && (
                    <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      <Lock className="w-3 h-3" /> Terkunci
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Body */}
              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {post.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {post.content}
                </p>
              </div>

              {/* Post Actions: Like, Comment Toggle, Moderation */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggleLike(post.id)}
                    className={`flex items-center gap-1.5 transition-colors ${
                      post.liked_by_user ? 'text-rose-600 font-semibold' : 'hover:text-rose-600'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${post.liked_by_user ? 'fill-current' : ''}`} />
                    <span className="tabular-nums">{post.likes} Suka</span>
                  </button>

                  <button
                    onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                    className="flex items-center gap-1.5 hover:text-emerald-700 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="tabular-nums">{post.comments.length} Tanggapan</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button
                      onClick={() => handleToggleLock(post.id)}
                      className="text-slate-400 hover:text-amber-700 p-1"
                      title={post.is_locked ? "Buka Kunci Diskusi" : "Kunci Diskusi"}
                    >
                      {post.is_locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    </button>
                  )}

                  {(isAuthor || isAdmin) && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Hapus Postingan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Comments Section */}
              <div className="pt-2 space-y-3">
                {/* Existing comments list */}
                {post.comments.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-50">
                    {post.comments.map(c => (
                      <div key={c.id} className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-start gap-2.5 text-xs">
                        <img
                          src={c.author_avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100"}
                          alt={c.author_name}
                          className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900">{c.author_name}</span>
                            <span className="text-[10px] text-slate-400 tabular-nums">{c.created_at}</span>
                          </div>
                          <p className="text-slate-700 mt-0.5 leading-relaxed">{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comment Input */}
                {!post.is_locked ? (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Tuliskan tanggapan Anda..."
                      value={activeCommentPostId === post.id ? commentText : ''}
                      onFocus={() => setActiveCommentPostId(post.id)}
                      onChange={(e) => {
                        setActiveCommentPostId(post.id);
                        setCommentText(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddComment(post.id);
                      }}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                    <button
                      onClick={() => handleAddComment(post.id)}
                      disabled={!commentText.trim() || activeCommentPostId !== post.id}
                      className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic text-center py-1">
                    Diskusi ini telah dikunci oleh administrator.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Buat Post Baru */}
      <Modal
        isOpen={isNewPostModalOpen}
        onClose={() => setIsNewPostModalOpen(false)}
        title="Buat Topik Diskusi Baru"
        maxWidth="lg"
      >
        <form onSubmit={handleCreatePost} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Kategori Diskusi</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium"
            >
              <option value="Karier">Karier & Tips Interview</option>
              <option value="Kuliah">Kuliah & Info Kampus</option>
              <option value="Networking">Networking & Kolaborasi Bisnis</option>
              <option value="Lowongan">Info Lowongan Kerja / Magang</option>
              <option value="Umum">Umum & Pengumuman</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Judul Diskusi *</label>
            <input
              type="text"
              required
              placeholder="Contoh: Sharing Tips Portfolio UKK untuk Melamar ke Agensi"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Isi Diskusi *</label>
            <textarea
              rows={5}
              required
              placeholder="Tuliskan pengalaman atau pertanyaan Anda secara rinci..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewPostModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publikasikan Topik</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
