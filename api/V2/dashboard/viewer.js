const { createApp, ref, onMounted } = Vue;

createApp({
  setup() {
    const items = ref([]);
    const lastUpdated = ref("Aguardando...");
    const isFileProtocol = ref(window.location.protocol === 'file:');
    const bkMap = ref({}); // Mapa de ID -> Nome

    // Caminho relativo ao JSON gerado pelo Python
    // O script Python deve rodar na raiz e salvar 'surebets_live.json'
    // O servidor http deve servir a raiz, entao '../surebets_live.json' se viewer estiver em /dashboard
    // OU se o usuario abrir o HTML direto, pode ter problemas de CORS/protocolo file://
    // Vamos assumir que o server roda na pasta dashboard ou raiz.
    // Melhor: assumir servidor na RAIZ do projeto. Entao dashboard/index.html acessa /surebets_live.json
    const JSON_URL = "/surebets_live.json";

    const fetchData = async () => {
      try {
        // Adiciona timestamp para evitar cache do browser
        const resp = await fetch(`${JSON_URL}?t=${Date.now()}`);
        if (!resp.ok) throw new Error("Falha ao carregar");

        const data = await resp.json();

        // Atualizar Mapa de Bookmakers com o que veio no payload principal
        data.forEach(row => {
            if (row.bookmakers && Array.isArray(row.bookmakers)) {
                row.bookmakers.forEach(bk => {
                    if (bk.id && bk.name) {
                        bkMap.value[bk.id] = bk.name;
                    }
                });
            }
        });

        // Normaliza dados se necessario
        // Mantem estado de 'showDetails' se o item ja existia
        const newItems = data.map((item) => {
          const existing = items.value.find((i) => i.arb_id === item.arb_id);
          return {
            ...item,
            showDetails: existing ? existing.showDetails : false,
            deep_data: item.deep_data || [],
          };
        });

        items.value = newItems.sort((a, b) => {
            // Ordenar por data decrescente (mais recente primeiro)
            return new Date(b.captured_at) - new Date(a.captured_at);
        });
        lastUpdated.value = new Date().toLocaleTimeString();
      } catch (e) {
        console.error("Erro no polling:", e);
        // Nao atualiza lastUpdated para indicar estagnação se falhar
      }
    };

    const toggleDetails = (item) => {
      item.showDetails = !item.showDetails;
    };

    const getBkName = (id) => {
        return bkMap.value[id] || 'Casa #' + id;
    };

    const getPercentClass = (p) => {
      if (p >= 5) return "bg-success";
      if (p >= 2) return "bg-primary";
      return "bg-secondary";
    };

    const formatTime = (iso) => {
      if (!iso) return "";
      const d = new Date(iso);
      return d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    };

    onMounted(() => {
      fetchData();
      // Polling a cada 2 segundos
      setInterval(fetchData, 2000);
    });

    return {
      items,
      lastUpdated,
      isFileProtocol,
      fetchData,
      toggleDetails,
      getBkName,
      getPercentClass,
      formatTime,
    };
  },
}).mount("#app");
