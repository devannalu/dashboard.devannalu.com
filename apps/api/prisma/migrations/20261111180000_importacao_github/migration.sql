-- AlterTable
ALTER TABLE `Project` ADD COLUMN `githubArchived` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `githubFullName` VARCHAR(200) NULL,
    ADD COLUMN `githubOrg` VARCHAR(100) NULL,
    ADD COLUMN `githubRepoId` VARCHAR(30) NULL,
    ADD COLUMN `githubUrl` VARCHAR(300) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Project_workspaceId_githubRepoId_key` ON `Project`(`workspaceId`, `githubRepoId`);

