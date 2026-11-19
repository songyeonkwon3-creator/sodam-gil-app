/* ==========================================================================
   auth.js — 계정 · 유저 레지스트리 (프로토타입 로그인)

   실제 Google / Apple OAuth 대신 로컬 계정을 만든다. 화면에서도 그렇게 밝힌다.
   · 유저 1명마다 story / learning / progress 를 따로 저장한다.
   · 관리자 페이지(admin.html)는 같은 레지스트리를 읽어 유저별 상태를 본다.
   · localStorage 키는 유저 아이디별로 갈라진다 → 계정을 바꿔도 진행이 섞이지 않는다.
   ========================================================================== */
window.EP = window.EP || {};

(function () {
  const USERS_KEY = 'ep01.users.v1';
  const SESSION_KEY = 'ep01.session.v1';

  const readJSON = (k, d) => {
    try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : d; }
    catch (e) { return d; }
  };
  const writeJSON = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  };

  const rid = () => 'u_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);

  const PROVIDERS = {
    google: { label: 'Google', short: 'G' },
    apple:  { label: 'Apple',  short: '' },
    guest:  { label: '게스트',  short: '·' }
  };

  const Auth = window.EP.Auth = {
    PROVIDERS,

    users() { return readJSON(USERS_KEY, {}); },

    list() {
      return Object.values(this.users()).sort((a, b) => (b.lastSeenAt || 0) - (a.lastSeenAt || 0));
    },

    get(id) { return this.users()[id] || null; },

    session() { return readJSON(SESSION_KEY, null); },

    current() {
      const s = this.session();
      return s ? this.get(s.id) : null;
    },

    uid() {
      const s = this.session();
      return s ? s.id : null;
    },

    /* 로그인 — 같은 provider+이름 조합이 이미 있으면 그 계정을 이어 쓴다 */
    signIn(provider, name) {
      const users = this.users();
      const nm = (name || '').trim();
      let found = null;
      if (provider !== 'guest' && nm) {
        found = Object.values(users).find(u => u.provider === provider && u.name === nm) || null;
      }
      const now = Date.now();
      let id;
      if (found) {
        id = found.id;
        users[id].lastSeenAt = now;
        if (nm) users[id].name = nm;
      } else {
        id = rid();
        users[id] = {
          id,
          provider,
          name: nm || (provider === 'guest' ? '게스트' : provider === 'google' ? 'Google 사용자' : 'Apple 사용자'),
          email: provider === 'guest' ? '' : (nm || 'user').toLowerCase().replace(/\s+/g, '.') + '@' + provider + '.example',
          createdAt: now,
          lastSeenAt: now,
          story: null,
          learning: null,
          progress: { cursor: 0, scene: 0, updatedAt: now }
        };
      }
      writeJSON(USERS_KEY, users);
      writeJSON(SESSION_KEY, { id, provider, at: now });
      return users[id];
    },

    /* 게스트가 이름을 넣고 시작할 때 — 세션 없으면 게스트 계정을 만들어 준다 */
    ensure(name) {
      if (this.uid()) {
        if (name) this.patch(this.uid(), { name: name.trim().slice(0, 12) || undefined });
        return this.current();
      }
      return this.signIn('guest', name);
    },

    signOut() { try { localStorage.removeItem(SESSION_KEY); } catch (e) {} },

    patch(id, obj) {
      const users = this.users();
      if (!users[id]) return null;
      users[id] = Object.assign({}, users[id], obj);
      users[id].lastSeenAt = Date.now();
      writeJSON(USERS_KEY, users);
      return users[id];
    },

    remove(id) {
      const users = this.users();
      delete users[id];
      writeJSON(USERS_KEY, users);
      try {
        localStorage.removeItem('ep01.story.v1.' + id);
        localStorage.removeItem('ep01.learning.v1.' + id);
        localStorage.removeItem('ep01.pos.' + id);
      } catch (e) {}
      const s = this.session();
      if (s && s.id === id) this.signOut();
    },

    /* 앱이 진행을 저장할 때마다 유저 레코드도 같이 갱신 */
    sync(payload) {
      const id = this.uid();
      if (!id) return;
      this.patch(id, payload);
    },

    keys: uid => ({
      story: 'ep01.story.v1.' + uid,
      learning: 'ep01.learning.v1.' + uid,
      pos: 'ep01.pos.' + uid
    }),

    /* 관리자 페이지용 — 데이터 내보내기 / 가져오기 */
    exportAll() {
      return {
        exportedAt: new Date().toISOString(),
        users: this.users(),
        content: window.EP.Content ? window.EP.Content.data : null
      };
    },
    importAll(obj) {
      if (obj && obj.users) writeJSON(USERS_KEY, obj.users);
      if (obj && obj.content && window.EP.Content) window.EP.Content.save(obj.content);
    },

    /* 계정 삭제·초기화 편의 */
    label(provider) { return (PROVIDERS[provider] || PROVIDERS.guest).label; }
  };
})();
