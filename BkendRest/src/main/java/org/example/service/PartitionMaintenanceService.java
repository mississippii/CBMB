package org.example.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Keeps the RANGE COLUMNS(created_at) partitions ahead of "now" so inserts never
 * fall into the pmax catch-all (which would defeat partition pruning and make
 * eventual data archival painful).
 *
 * The strategy: for each partitioned table, ensure the next {@link #FUTURE_MONTHS}
 * monthly partitions exist before pmax. Idempotent — partitions already present
 * are skipped. Safe to run repeatedly.
 *
 * Implemented with raw `ALTER TABLE ... REORGANIZE PARTITION pmax INTO (...)`
 * because Hibernate has no partition DDL support. Runs:
 *   - once at application boot (catches gaps from a manual schema reset)
 *   - at 03:15 on the 25th of each month (well before month-end)
 */
@Service
public class PartitionMaintenanceService {

    private static final Logger log = LoggerFactory.getLogger(PartitionMaintenanceService.class);

    /** Tables that follow the monthly RANGE COLUMNS(created_at) + pmax convention. */
    private static final List<String> PARTITIONED_TABLES = List.of(
            "payments",
            "transactions",
            "box_ledger",
            "stock_ledger",
            "account_ledger"
    );

    /** Number of months ahead of "now" to keep pre-created. */
    private static final int FUTURE_MONTHS = 3;

    private static final DateTimeFormatter PART_NAME = DateTimeFormatter.ofPattern("'p'yyyyMM");
    private static final DateTimeFormatter BOUNDARY = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @PersistenceContext
    private EntityManager em;

    /** Run once shortly after startup, then monthly. */
    @Scheduled(initialDelay = 30_000, fixedDelay = Long.MAX_VALUE)
    public void runOnBoot() {
        ensureFuturePartitions();
    }

    /** Cron: 03:15 on the 25th of each month. */
    @Scheduled(cron = "0 15 3 25 * *")
    public void runMonthly() {
        ensureFuturePartitions();
    }

    @Transactional
    public void ensureFuturePartitions() {
        YearMonth now = YearMonth.now();
        for (String table : PARTITIONED_TABLES) {
            try {
                List<String> existing = listPartitions(table);
                for (int i = 0; i <= FUTURE_MONTHS; i++) {
                    YearMonth month = now.plusMonths(i);
                    String name = month.format(PART_NAME);
                    if (existing.contains(name)) continue;
                    addPartition(table, name, month.plusMonths(1).atDay(1));
                    log.info("Added partition {} to {}", name, table);
                }
            } catch (Exception ex) {
                // Don't let one bad table take the whole job down.
                log.error("Partition maintenance failed for {}: {}", table, ex.getMessage());
            }
        }
    }

    @SuppressWarnings("unchecked")
    private List<String> listPartitions(String table) {
        return em.createNativeQuery("""
                SELECT partition_name FROM information_schema.partitions
                WHERE table_schema = DATABASE() AND table_name = :t AND partition_name IS NOT NULL
                """)
                .setParameter("t", table)
                .getResultList();
    }

    /**
     * REORGANIZE pmax INTO (new_partition, pmax) — splits the catch-all so the
     * new month lands in its own partition while pmax stays as the catch-all
     * for anything beyond it. Boundary is the FIRST day of the month AFTER the
     * partition's month (so all of `month` falls into the new partition).
     */
    private void addPartition(String table, String name, LocalDate exclusiveUpperBound) {
        String sql = String.format(
                "ALTER TABLE `%s` REORGANIZE PARTITION pmax INTO (" +
                "PARTITION %s VALUES LESS THAN ('%s'), " +
                "PARTITION pmax VALUES LESS THAN (MAXVALUE))",
                table, name, exclusiveUpperBound.format(BOUNDARY)
        );
        em.createNativeQuery(sql).executeUpdate();
    }
}
