/**
 * Server Status Indicator
 * Shows the status of the Python medical server
 */

'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { pythonServerClient, ServerHealthResponse } from '@/lib/pythonServerClient';
import { RefreshCw, Activity, AlertCircle, CheckCircle, Server } from 'lucide-react';

export function ServerStatusIndicator() {
  const [serverStatus, setServerStatus] = useState<ServerHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkServerStatus = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const status = await pythonServerClient.checkHealth();
      setServerStatus(status);
      setLastChecked(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Server check failed');
      setServerStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkServerStatus();
    
    // Check server status every 30 seconds
    const interval = setInterval(checkServerStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (error || !serverStatus) return 'destructive';
    if (serverStatus.status === 'healthy') return 'default';
    return 'secondary';
  };

  const getStatusText = () => {
    if (error) return 'Offline';
    if (!serverStatus) return 'Unknown';
    return serverStatus.status === 'healthy' ? 'Online' : 'Issues';
  };

  const getStatusIcon = () => {
    if (isLoading) return <RefreshCw className="h-3 w-3 animate-spin" />;
    if (error || !serverStatus) return <AlertCircle className="h-3 w-3" />;
    return <CheckCircle className="h-3 w-3" />;
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Status Badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={getStatusColor() as any} className="gap-1">
              {getStatusIcon()}
              <Server className="h-3 w-3" />
              {getStatusText()}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <div>Python Medical Server</div>
              {lastChecked && (
                <div className="text-muted-foreground">
                  Last checked: {lastChecked.toLocaleTimeString()}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Refresh Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={checkServerStatus}
          disabled={isLoading}
          className="h-6 w-6 p-0"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </TooltipProvider>
  );
}

export function ServerStatusCard() {
  const [serverStatus, setServerStatus] = useState<ServerHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkServerStatus = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const status = await pythonServerClient.checkHealth();
      setServerStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Server check failed');
      setServerStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkServerStatus();
  }, []);

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <CardTitle className="text-sm">Server Offline</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Python medical server is not available
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xs text-muted-foreground mb-2">
            Error: {error}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkServerStatus}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Retry Connection
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!serverStatus) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <CardTitle className="text-sm">Checking Server...</CardTitle>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const systemInfo = serverStatus.system_info;
  const uptimeMinutes = Math.max(0, Math.round((systemInfo.uptime_seconds || 0) / 60));
  const errorRate = (systemInfo.error_rate ?? 0).toFixed(2);

  return (
    <Card className="border-green-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-green-600" />
          <CardTitle className="text-sm">Server Online</CardTitle>
          <Badge variant="outline" className="text-xs">
            {serverStatus.status}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Python medical server is running
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Models Status */}
        <div>
          <div className="text-xs font-medium mb-1">Models Loaded:</div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {Object.entries(serverStatus.models_loaded).map(([model, loaded]) => (
              <div key={model} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${loaded ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="truncate">{model.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Info */}
        <div>
          <div className="text-xs font-medium mb-1">System Info:</div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div>Uptime: {uptimeMinutes}m</div>
            <div>Total requests: {systemInfo.total_requests}</div>
            <div>Symptom queries: {systemInfo.symptom_requests}</div>
            <div>RAG queries: {systemInfo.rag_requests}</div>
            <div>Hybrid queries: {systemInfo.hybrid_requests}</div>
            <div>Error rate: {errorRate}%</div>
            {systemInfo.last_error && (
              <div className="text-red-500">Last error: {systemInfo.last_error}</div>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={checkServerStatus}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3 mr-1" />
          )}
          Refresh Status
        </Button>
      </CardContent>
    </Card>
  );
}
