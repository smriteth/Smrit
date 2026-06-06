import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../main.dart';
import '../services/fms_api_service.dart';

class TripHistoryScreen extends StatefulWidget {
  const TripHistoryScreen({super.key});
  @override
  State<TripHistoryScreen> createState() => _TripHistoryScreenState();
}

class _TripHistoryScreenState extends State<TripHistoryScreen> {
  List<Map<String, dynamic>> _trips = [];
  bool _loading = true;
  String? _error;
  String _filter = 'ALL';
  int _offset = 0;
  bool _hasMore = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool refresh = false}) async {
    if (refresh) setState(() { _trips = []; _offset = 0; _hasMore = true; });
    setState(() { _loading = true; _error = null; });
    try {
      final data = await FmsApiService.getTripHistory(limit: 20, offset: _offset);
      setState(() {
        _trips = [..._trips, ...data];
        _offset += data.length;
        _hasMore = data.length == 20;
      });
    } catch (_) {
      setState(() => _error = 'Failed to load trips.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> get _filtered {
    if (_filter == 'ALL') return _trips;
    return _trips.where((t) => t['status'] == _filter).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SmritColors.background,
      body: Column(children: [
        // Filter chips
        Container(
          color: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(children: ['ALL', 'COMPLETED', 'STARTED', 'IN_TRANSIT', 'FAILED'].map((s) =>
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(s.replaceAll('_', ' '),
                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500,
                      color: _filter == s ? Colors.white : SmritColors.text)),
                  selected: _filter == s,
                  onSelected: (_) => setState(() => _filter = s),
                  selectedColor: SmritColors.primary,
                  backgroundColor: SmritColors.background,
                  side: BorderSide(color: _filter == s ? SmritColors.primary : SmritColors.border),
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                ),
              ),
            ).toList()),
          ),
        ),

        // List
        Expanded(
          child: _loading && _trips.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      const Icon(Icons.error_outline, size: 48, color: SmritColors.muted),
                      const SizedBox(height: 8),
                      Text(_error!, style: GoogleFonts.inter(color: SmritColors.danger)),
                      const SizedBox(height: 16),
                      ElevatedButton(onPressed: () => _load(refresh: true), child: const Text('Retry')),
                    ]))
                  : _filtered.isEmpty
                      ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                          const Icon(Icons.route_outlined, size: 56, color: SmritColors.muted),
                          const SizedBox(height: 8),
                          Text('No trips yet', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: SmritColors.text)),
                          const SizedBox(height: 4),
                          Text('Completed trips will appear here', style: GoogleFonts.inter(fontSize: 13, color: SmritColors.muted)),
                        ]))
                      : RefreshIndicator(
                          onRefresh: () => _load(refresh: true),
                          child: ListView.separated(
                            padding: const EdgeInsets.all(16),
                            itemCount: _filtered.length + (_hasMore ? 1 : 0),
                            separatorBuilder: (_, __) => const SizedBox(height: 10),
                            itemBuilder: (ctx, i) {
                              if (i == _filtered.length) {
                                return Center(child: Padding(
                                  padding: const EdgeInsets.all(12),
                                  child: ElevatedButton(
                                    onPressed: _loading ? null : _load,
                                    style: ElevatedButton.styleFrom(minimumSize: const Size(120, 40)),
                                    child: _loading ? const SizedBox(width: 18, height: 18,
                                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                        : const Text('Load More'),
                                  ),
                                ));
                              }
                              final trip = _filtered[i];
                              return _TripCard(trip: trip);
                            },
                          ),
                        ),
        ),
      ]),
    );
  }
}

class _TripCard extends StatelessWidget {
  final Map<String, dynamic> trip;
  const _TripCard({required this.trip});

  Color get _statusColor {
    switch (trip['status']) {
      case 'COMPLETED': return SmritColors.success;
      case 'STARTED': case 'IN_TRANSIT': return SmritColors.warning;
      case 'FAILED': return SmritColors.danger;
      default: return SmritColors.muted;
    }
  }

  @override
  Widget build(BuildContext context) {
    final startedAt = trip['startedAt'] != null
        ? DateFormat('dd MMM yyyy').format(DateTime.parse(trip['startedAt']).toLocal())
        : '—';
    final earnings = trip['totalEarningsEtb'];
    final earningsNum = earnings != null ? (earnings is num ? earnings : double.tryParse(earnings.toString())) : null;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8)],
        border: Border(left: BorderSide(color: _statusColor, width: 4)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Expanded(child: Text(
              '${trip['originName'] ?? '—'} → ${trip['destinationName'] ?? '—'}',
              style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: SmritColors.text),
              maxLines: 1, overflow: TextOverflow.ellipsis,
            )),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: _statusColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                (trip['status'] as String?)?.replaceAll('_', ' ') ?? '—',
                style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: _statusColor),
              ),
            ),
          ]),
          const SizedBox(height: 8),
          Row(children: [
            Icon(Icons.calendar_today_outlined, size: 13, color: SmritColors.muted),
            const SizedBox(width: 4),
            Text(startedAt, style: GoogleFonts.inter(fontSize: 12, color: SmritColors.muted)),
            const SizedBox(width: 16),
            if (trip['actualDistanceKm'] != null) ...[
              Icon(Icons.route_outlined, size: 13, color: SmritColors.muted),
              const SizedBox(width: 4),
              Text('${trip['actualDistanceKm']} km', style: GoogleFonts.inter(fontSize: 12, color: SmritColors.muted)),
            ],
            const Spacer(),
            if (earningsNum != null && earningsNum > 0)
              Text('ETB ${earningsNum.toStringAsFixed(0)}',
                style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: SmritColors.success)),
          ]),
        ]),
      ),
    );
  }
}
