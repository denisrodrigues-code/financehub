using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinanceHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBankMetadataToAccounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BankCode",
                table: "Accounts",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BankIspb",
                table: "Accounts",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BankName",
                table: "Accounts",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Institutions",
                keyColumn: "Id",
                keyValue: new Guid("6dcb4ef1-bbf8-4a3c-8947-5fef443f2f8e"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 3, 18, 21, 36, 56, 109, DateTimeKind.Utc).AddTicks(4589), new DateTime(2026, 3, 18, 21, 36, 56, 109, DateTimeKind.Utc).AddTicks(4589) });

            migrationBuilder.UpdateData(
                table: "Institutions",
                keyColumn: "Id",
                keyValue: new Guid("7b0cb7dc-7ab9-4efb-8d26-91ce0ec18d52"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 3, 18, 21, 36, 56, 109, DateTimeKind.Utc).AddTicks(3492), new DateTime(2026, 3, 18, 21, 36, 56, 109, DateTimeKind.Utc).AddTicks(3493) });

            migrationBuilder.UpdateData(
                table: "Institutions",
                keyColumn: "Id",
                keyValue: new Guid("fcbf1932-d8e7-4a7d-bbc0-8ae3978ef326"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 3, 18, 21, 36, 56, 109, DateTimeKind.Utc).AddTicks(4569), new DateTime(2026, 3, 18, 21, 36, 56, 109, DateTimeKind.Utc).AddTicks(4569) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BankCode",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "BankIspb",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "BankName",
                table: "Accounts");

            migrationBuilder.UpdateData(
                table: "Institutions",
                keyColumn: "Id",
                keyValue: new Guid("6dcb4ef1-bbf8-4a3c-8947-5fef443f2f8e"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 3, 18, 15, 21, 33, 25, DateTimeKind.Utc).AddTicks(5190), new DateTime(2026, 3, 18, 15, 21, 33, 25, DateTimeKind.Utc).AddTicks(5190) });

            migrationBuilder.UpdateData(
                table: "Institutions",
                keyColumn: "Id",
                keyValue: new Guid("7b0cb7dc-7ab9-4efb-8d26-91ce0ec18d52"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 3, 18, 15, 21, 33, 25, DateTimeKind.Utc).AddTicks(4160), new DateTime(2026, 3, 18, 15, 21, 33, 25, DateTimeKind.Utc).AddTicks(4160) });

            migrationBuilder.UpdateData(
                table: "Institutions",
                keyColumn: "Id",
                keyValue: new Guid("fcbf1932-d8e7-4a7d-bbc0-8ae3978ef326"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 3, 18, 15, 21, 33, 25, DateTimeKind.Utc).AddTicks(5171), new DateTime(2026, 3, 18, 15, 21, 33, 25, DateTimeKind.Utc).AddTicks(5171) });
        }
    }
}
