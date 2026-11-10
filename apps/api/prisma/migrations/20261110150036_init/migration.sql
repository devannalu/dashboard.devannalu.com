-- CreateTable
CREATE TABLE `Workspace` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `slug` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Workspace_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `passwordHash` VARCHAR(255) NULL,
    `name` VARCHAR(120) NOT NULL,
    `timezone` VARCHAR(64) NOT NULL DEFAULT 'America/Sao_Paulo',
    `weekStartsOn` TINYINT NOT NULL DEFAULT 0,
    `themePreference` ENUM('LIGHT', 'DARK', 'SYSTEM') NOT NULL DEFAULT 'SYSTEM',
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkspaceMember` (
    `workspaceId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'COLLABORATOR', 'CLIENT') NOT NULL DEFAULT 'OWNER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WorkspaceMember_userId_idx`(`userId`),
    PRIMARY KEY (`workspaceId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `ip` VARCHAR(45) NULL,
    `userAgent` VARCHAR(255) NULL,
    `revokedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Session_tokenHash_key`(`tokenHash`),
    INDEX `Session_userId_idx`(`userId`),
    INDEX `Session_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(80) NOT NULL,
    `ip` VARCHAR(45) NULL,
    `userAgent` VARCHAR(255) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_workspaceId_createdAt_idx`(`workspaceId`, `createdAt`),
    INDEX `AuditLog_action_createdAt_idx`(`action`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Job` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(80) NOT NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD') NOT NULL DEFAULT 'PENDING',
    `runAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `maxAttempts` INTEGER NOT NULL DEFAULT 6,
    `lockedAt` DATETIME(3) NULL,
    `lockedBy` VARCHAR(80) NULL,
    `lastError` TEXT NULL,
    `dedupeKey` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finishedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Job_dedupeKey_key`(`dedupeKey`),
    INDEX `Job_status_runAt_idx`(`status`, `runAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WorkspaceMember` ADD CONSTRAINT `WorkspaceMember_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkspaceMember` ADD CONSTRAINT `WorkspaceMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
