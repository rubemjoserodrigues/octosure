<?php
declare(strict_types=1);

require_once __DIR__ . '/../api_bootstrap.php';

api_require_method('GET');

try {
    painel_plans_install_schema();
    $externalRef = trim((string) ($_GET['external_ref'] ?? ''));
    $transactionId = trim((string) ($_GET['transaction_id'] ?? ''));
    $payment = null;
    if ($transactionId !== '') {
        $payment = painel_payment_find_by_transaction($transactionId);
    }
    if (!$payment && $externalRef !== '') {
        $payment = painel_payment_find_by_external_ref($externalRef);
    }
    if (!$payment) {
        api_json(['success' => false, 'message' => 'Pagamento nao encontrado.'], 404);
    }
    $payment = painel_reconcile_payment_status($payment);
    api_json([
        'success' => true,
        'data' => [
            'externalRef' => (string) $payment['external_ref'],
            'transactionId' => (string) ($payment['pagou_transaction_id'] ?? ''),
            'status' => (string) $payment['status'],
            'paidAt' => $payment['paid_at'] ?? null,
            'amountCents' => (int) $payment['amount_cents'],
            'pix' => [
                'qrCode' => (string) ($payment['pix_qr_code'] ?? ''),
                'qrImage' => isset($_GET['include_pix']) && (string) $_GET['include_pix'] === '1'
                    ? painel_pix_qr_image_data_url((string) ($payment['pix_qr_code'] ?? ''))
                    : '',
            ],
        ],
    ]);
} catch (Throwable $e) {
    api_json(['success' => false, 'message' => 'Erro ao consultar pagamento.'], 500);
}
