import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
@Catch()
export class ErrorFilter implements ExceptionFilter {
 private readonly logger = new Logger(ErrorFilter.name);
 catch(exception: any, host: ArgumentsHost) {
  const response = host.switchToHttp().getResponse<Response>();
  if (exception instanceof HttpException) { const status=exception.getStatus(); const body=exception.getResponse(); response.status(status).json(typeof body === 'string' ? {statusCode:status,message:body} : body); return; }
  const known:Record<string,[number,string]> = {
   P2002:[409,'Cette valeur existe déjà. Vérifiez les données uniques (code, matricule ou e-mail).'],
   P2003:[409,'Cette donnée est utilisée ou la catégorie sélectionnée n’existe plus.'],
   P2025:[404,'Cet enregistrement est introuvable ou a déjà été supprimé.'],
  };
  const error = known[exception?.code]; if(error){response.status(error[0]).json({statusCode:error[0],message:error[1]});return;}
  this.logger.error('Erreur interne', exception?.stack); response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({statusCode:500,message:'Une erreur interne est survenue. Réessayez ou contactez votre établissement.'});
 }
}
