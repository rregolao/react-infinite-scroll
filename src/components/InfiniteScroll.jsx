import { useEffect, useRef, useState } from "react";
import axios from "axios";

const InfiniteScroll = () => {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [erro, setErro] = useState(null);

  // Refs para o listener de scroll sempre enxergar o estado mais recente
  // sem precisar recriar o listener (e o throttle) a cada mudança —
  // exatamente o que causava o bug do throttle "perder a memória" (ver
  // explicação abaixo).
  const isLoadingRef = useRef(isLoading);
  const hasMoreDataRef = useRef(hasMoreData);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    hasMoreDataRef.current = hasMoreData;
  }, [hasMoreData]);

  const fetchPosts = async (paginaAtual, sinal) => {
    setIsLoading(true);
    setErro(null);
    try {
      const response = await axios.get(
        `https://jsonplaceholder.typicode.com/posts?_page=${paginaAtual}&_limit=10`,
        { signal: sinal }
      );

      if (response.data.length > 0) {
        setPosts((prevPosts) => [...prevPosts, ...response.data]);
      } else {
        setHasMoreData(false);
      }
    } catch (error) {
      if (axios.isCancel(error) || error.name === "CanceledError") return;
      console.error("Erro ao buscar os posts:", error);
      setErro("Não foi possível carregar os posts. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchPosts(page, controller.signal);
    // Cancela a requisição em andamento se o componente for desmontado (ou
    // se a página mudar de novo) antes dela terminar, evitando o aviso de
    // "atualizar estado em componente desmontado".
    return () => controller.abort();
  }, [page]);

  // O listener de scroll é anexado UMA ÚNICA VEZ (dependências vazias). O
  // throttle é criado uma única vez também, então sua "memória" de última
  // chamada (lastCall) é preservada de verdade ao longo do tempo — antes,
  // o throttle era recriado a cada mudança de isLoading/hasMoreData (o que
  // acontece a cada página carregada), e cada instância nova sempre deixava
  // passar sua primeira chamada, quebrando a garantia de "no máximo uma
  // chamada a cada 150ms".
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 100 &&
        !isLoadingRef.current &&
        hasMoreDataRef.current
      ) {
        setPage((prevPage) => prevPage + 1);
      }
    };

    const throttledHandleScroll = throttle(handleScroll, 150);
    window.addEventListener("scroll", throttledHandleScroll);
    return () => {
      window.removeEventListener("scroll", throttledHandleScroll);
    };
  }, []);

  const tentarNovamente = () => {
    fetchPosts(page);
  };

  return (
    <div>
      <h1>Infinite Scroll</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <h3>{post.title}</h3>
            <p>{post.body}</p>
          </li>
        ))}
      </ul>
      {isLoading && <p>Carregando mais posts...</p>}
      {erro && (
        <div role="alert" className="erro">
          <p>{erro}</p>
          <button onClick={tentarNovamente}>Tentar novamente</button>
        </div>
      )}
      {!isLoading && !hasMoreData && !erro && (
        <p className="fim-da-lista">Não há mais posts para carregar.</p>
      )}
    </div>
  );
};

// Função para controlar a taxa de execução de outra função
function throttle(func, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = new Date().getTime();
    if (now - lastCall < delay) return;
    lastCall = now;
    return func(...args);
  };
}

export default InfiniteScroll;
