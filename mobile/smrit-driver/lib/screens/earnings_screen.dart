import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../main.dart';
import '../services/fms_api_service.dart';

class EarningsScreen extends StatefulWidget {
  final String driverId;
  const EarningsScreen({super.key, required this.driverId});
  @override
  State<EarningsScreen> createState() => _EarningsScreenState();
}

class _EarningsScreenState extends State<EarningsScreen> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (widget.driverId.isEmpty) {
      setState(() { _loading = false; _error = 'Driver ID not found.'; });
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final data = await FmsApiService.getEarnings(widget.driverId);
      setState(() => _data = data);
    } catch (_) {
      setState(() => _error = 'Failed to load earnings.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      const Icon(Icons.error_outline, size: 48, color: SmritColors.muted),
      const SizedBox(height: 8),
      Text(_error!, style: GoogleFonts.inter(color: SmritColors.danger)),
      const SizedBox(height: 16),
      ElevatedButton(onPressed: _load, child: const Text('Retry')),
    ]));

    final summary = _data?['summary'] as Map<String, dynamic>?;
    final earnings = (_data?['earnings'] as List?)?.cast<Map<String, dynamic>>() ?? [];

    return RefreshIndicator(
      onRefresh: _load,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(children: [
              // Summary grid
              GridView.count(
                crossAxisCount: 2, shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 1.4,
                children: [
                  _summaryCard('Total Earned', summary?['totalEtb'], Colors.purple),
                  _summaryCard('This Month', summary?['thisMonthEtb'], SmritColors.primary),
                  _summaryCard('Pending', summary?['pendingEtb'], SmritColors.warning),
                  _summaryCard('Paid Out', summary?['paidEtb'], SmritColors.success),
                ],
              ),
              const SizedBox(height: 20),
              Align(
                alignment: Alignment.centerLeft,
                child: Text('Recent Earnings', style: GoogleFonts.inter(
                  fontSize: 16, fontWeight: FontWeight.w700, color: SmritColors.text)),
              ),
              const SizedBox(height: 12),
            ]),
          )),
          earnings.isEmpty
              ? SliverFillRemaining(child: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const Icon(Icons.payments_outlined, size: 56, color: SmritColors.muted),
                  const SizedBox(height: 8),
                  Text('No earnings yet', style: GoogleFonts.inter(fontSize: 16, color: SmritColors.muted)),
                ])))
              : SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (ctx, i) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _EarningCard(earning: earnings[i]),
                      ),
                      childCount: earnings.length,
                    ),
                  ),
                ),
        ],
      ),
    );
  }

  Widget _summaryCard(String label, dynamic value, Color color) {
    final num = value != null ? double.tryParse(value.toString()) ?? 0.0 : 0.0;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8)],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
        Text(label, style: GoogleFonts.inter(fontSize: 11, color: SmritColors.muted, fontWeight: FontWeight.w500)),
        const SizedBox(height: 4),
        Text('ETB ${num.toStringAsFixed(0)}', style: GoogleFonts.inter(
          fontSize: 18, fontWeight: FontWeight.w800, color: color),
          maxLines: 1, overflow: TextOverflow.ellipsis,
        ),
      ]),
    );
  }
}

class _EarningCard extends StatelessWidget {
  final Map<String, dynamic> earning;
  const _EarningCard({required this.earning});

  Color get _statusColor {
    switch (earning['status']) {
      case 'PAID': return SmritColors.success;
      case 'APPROVED': return SmritColors.primary;
      default: return SmritColors.warning;
    }
  }

  @override
  Widget build(BuildContext context) {
    final trip = earning['trip'] as Map<String, dynamic>?;
    final total = double.tryParse(earning['totalEarning']?.toString() ?? '0') ?? 0;
    final date = earning['createdAt'] != null
        ? DateFormat('dd MMM yyyy').format(DateTime.parse(earning['createdAt']).toLocal())
        : '—';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(14),
        border: Border(left: BorderSide(color: _statusColor, width: 4)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 6)],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(children: [
          Container(
            width: 42, height: 42,
            decoration: BoxDecoration(color: _statusColor.withValues(alpha: 0.12), shape: BoxShape.circle),
            child: Icon(Icons.payments_outlined, size: 22, color: _statusColor),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(trip != null ? '${trip['originName'] ?? '—'} → ${trip['destinationName'] ?? '—'}' : '—',
              style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: SmritColors.text),
              maxLines: 1, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 2),
            Text(date, style: GoogleFonts.inter(fontSize: 11, color: SmritColors.muted)),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('ETB ${total.toStringAsFixed(0)}',
              style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800, color: SmritColors.text)),
            Container(
              margin: const EdgeInsets.only(top: 4),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: _statusColor.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
              child: Text(earning['status'] ?? '—',
                style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: _statusColor)),
            ),
          ]),
        ]),
      ),
    );
  }
}
