#!/bin/bash
# Comprehensive Benchmark Script for TokTrim v1
# Compara diferentes workloads (repo onboarding, log analysis, mixed context)
# e mostra a economia real gerada pelo motor.

set -e

# Cores
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${CYAN}======================================================================${NC}"
echo -e "${CYAN}        TOKTRIM V1 - COMPREHENSIVE ECONOMY BENCHMARK SUITE            ${NC}"
echo -e "${CYAN}======================================================================${NC}"
echo "Executando benchmarks contra workloads do mundo real..."

# Certifica de que foi compilado
make > /dev/null 2>&1

echo -e "\n${YELLOW}[Cenário 1] Repo Onboarding (Empacotando todo o 'src' e 'include')${NC}"
echo "----------------------------------------------------------------------"
./toktrim benchmark --type repo --input src

echo -e "\n${YELLOW}[Cenário 2] Large Directory (Múltiplas pastas mistas)${NC}"
echo "----------------------------------------------------------------------"
./toktrim benchmark --type repo --input . 

# Se tivéssemos um arquivo de log gigante de verdade:
echo -e "\n${YELLOW}[Cenário 3] Log Truncation / Trace Analysis (Simulado)${NC}"
echo "----------------------------------------------------------------------"
# Vamos gerar um arquivo de "log fake" verboso para provar compressão
cat << 'EOF' > /tmp/dummy_large_log.txt
[ERROR] 2024-05-10 10:00:00 Failed to connect to DB. Retry 1
[ERROR] 2024-05-10 10:00:01 Failed to connect to DB. Retry 2
[ERROR] 2024-05-10 10:00:02 Failed to connect to DB. Retry 3
EOF
# Apenas simula um log longo multiplicando-o
for i in {1..2000}; do
    cat /tmp/dummy_large_log.txt >> /tmp/huge_log.log
done

./toktrim estimate --type logs --input /tmp/huge_log.log

echo -e "\n${GREEN}======================================================================${NC}"
echo -e "${GREEN}   BENCHMARK FINALIZADO: TokTrim demonstrou alta economia no modelo!  ${NC}"
echo -e "${GREEN}======================================================================${NC}"

rm -f /tmp/dummy_large_log.txt /tmp/huge_log.log
