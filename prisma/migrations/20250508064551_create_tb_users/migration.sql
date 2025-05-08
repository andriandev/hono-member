-- CreateTable
CREATE TABLE `tb_users` (
    `id` INTEGER NOT NULL,
    `premium` INTEGER NOT NULL DEFAULT 0,
    `token` VARCHAR(400) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
